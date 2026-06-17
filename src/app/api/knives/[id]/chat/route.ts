import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import { getStorage } from "@/lib/storage";
import { badRequest, fromZod, notFound, serverError } from "@/lib/http";
import { buildKnifeChatSystemPrompt } from "@/lib/chat/system-prompt";
import { LOCAL_TOOLS, runTool } from "@/lib/chat/tools";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;
const WEB_SEARCH_MAX_USES = 5;
const MAX_TOOL_ROUNDS = 6;

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(40),
});

type Ctx = { params: Promise<{ id: string }> };

type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; serverSide?: boolean }
  | { type: "tool_end"; id: string; ok: boolean }
  | { type: "citation"; url: string; title?: string }
  | { type: "done"; usage?: { input: number; output: number } }
  | { type: "error"; message: string };

function encode(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export async function POST(req: Request, { params }: Ctx) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "chat is disabled — ANTHROPIC_API_KEY not set" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let id: string;
  try {
    ({ id } = await params);
  } catch (err) {
    return serverError(err);
  }

  let parsed: z.infer<typeof BodySchema>;
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    parsed = BodySchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) return fromZod(err);
    return serverError(err);
  }

  const storage = getStorage();
  const knife = await storage.getKnife(id);
  if (!knife) return notFound("knife not found");
  const [owner, abrasives] = await Promise.all([
    knife.ownerId ? storage.getOwner(knife.ownerId) : Promise.resolve(null),
    storage.listAbrasives(),
  ]);

  const systemPrompt = buildKnifeChatSystemPrompt({ knife, owner, abrasives });
  const client = new Anthropic({ apiKey });

  const messages: MessageParam[] = parsed.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const seenCitations = new Set<string>();
      let totalInput = 0;
      let totalOutput = 0;

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const tools = [
            {
              type: "web_search_20250305" as const,
              name: "web_search" as const,
              max_uses: WEB_SEARCH_MAX_USES,
            },
            ...LOCAL_TOOLS,
          ];
          if (round === 0) {
            console.log(
              `[chat] round 0 → ${tools.length} tools:`,
              tools.map((t) => t.name).join(", "),
            );
          }
          const events = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: [
              {
                type: "text",
                text: systemPrompt,
                cache_control: { type: "ephemeral" },
              },
            ],
            messages,
            tools,
          });

          for await (const event of events) {
            if (event.type === "content_block_start") {
              const block = event.content_block;
              if (block.type === "server_tool_use") {
                controller.enqueue(
                  encode({
                    type: "tool_start",
                    id: block.id,
                    name: block.name,
                    serverSide: true,
                  }),
                );
              } else if (block.type === "tool_use") {
                controller.enqueue(
                  encode({
                    type: "tool_start",
                    id: block.id,
                    name: block.name,
                  }),
                );
              }
            } else if (event.type === "content_block_delta") {
              const delta = event.delta;
              if (delta.type === "text_delta") {
                controller.enqueue(encode({ type: "text", text: delta.text }));
              } else if (delta.type === "citations_delta") {
                const c = delta.citation as { url?: string; title?: string };
                const url = c?.url;
                if (url && !seenCitations.has(url)) {
                  seenCitations.add(url);
                  controller.enqueue(
                    encode({ type: "citation", url, title: c.title }),
                  );
                }
              }
            }
          }

          const final = await events.finalMessage();
          if (final.usage) {
            totalInput += final.usage.input_tokens ?? 0;
            totalOutput += final.usage.output_tokens ?? 0;
          }

          if (final.stop_reason !== "tool_use") {
            controller.enqueue(
              encode({
                type: "done",
                usage: { input: totalInput, output: totalOutput },
              }),
            );
            return;
          }

          // Execute local tools and feed results back. Server-side tools
          // (web_search) are already resolved by the API in the same turn,
          // so we just need to handle plain tool_use blocks.
          const toolUseBlocks = final.content.filter(
            (b): b is ToolUseBlock => b.type === "tool_use",
          );
          if (toolUseBlocks.length === 0) {
            controller.enqueue(
              encode({
                type: "done",
                usage: { input: totalInput, output: totalOutput },
              }),
            );
            return;
          }

          const toolResults: ToolResultBlockParam[] = [];
          for (const block of toolUseBlocks) {
            try {
              const result = await runTool(block.name, block.input);
              controller.enqueue(
                encode({ type: "tool_end", id: block.id, ok: true }),
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            } catch (err) {
              controller.enqueue(
                encode({ type: "tool_end", id: block.id, ok: false }),
              );
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content:
                  err instanceof Error ? err.message : "tool execution failed",
                is_error: true,
              });
            }
          }

          messages.push({
            role: "assistant",
            content: final.content as ContentBlockParam[],
          });
          messages.push({ role: "user", content: toolResults });
        }

        controller.enqueue(
          encode({
            type: "error",
            message: `tool-use loop exceeded ${MAX_TOOL_ROUNDS} rounds`,
          }),
        );
      } catch (err) {
        console.error("[chat]", err);
        const message =
          err instanceof Error ? err.message : "chat stream failed";
        controller.enqueue(encode({ type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
