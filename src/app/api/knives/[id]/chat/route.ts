import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { z } from "zod";
import { getStorage } from "@/lib/storage";
import { badRequest, fromZod, notFound, serverError } from "@/lib/http";
import { buildKnifeChatSystemPrompt } from "@/lib/chat/system-prompt";
import { LOCAL_TOOLS, runTool } from "@/lib/chat/tools";
import { encode, runAgentStream } from "@/lib/chat/agent-stream";

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

  const tools = [
    {
      type: "web_search_20250305" as const,
      name: "web_search" as const,
      max_uses: WEB_SEARCH_MAX_USES,
    },
    ...LOCAL_TOOLS,
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runAgentStream({
          client,
          model: MODEL,
          maxTokens: MAX_TOKENS,
          maxRounds: MAX_TOOL_ROUNDS,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages,
          tools,
          controller,
          runTool: (name, input) => runTool(name, input, { knifeId: id }),
        });
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
