import type Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageParam,
  TextBlockParam,
  ToolResultBlockParam,
  ToolUnion,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/messages";

// One line of newline-delimited JSON per event. Shared by the knife
// chat (`/api/knives/[id]/chat`) and the vision scan
// (`/api/knives/scan`) — both stream the same shape so the client-side
// reducers can be reused. `proposal` is scan-only; chat never emits it.
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_start"; id: string; name: string; serverSide?: boolean }
  | { type: "tool_end"; id: string; name: string; ok: boolean }
  | { type: "citation"; url: string; title?: string }
  | { type: "proposal"; suggestion: Record<string, unknown> }
  | { type: "done"; usage?: { input: number; output: number } }
  | { type: "error"; message: string };

export function encode(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(event)}\n`);
}

export interface AgentStreamArgs {
  client: Anthropic;
  model: string;
  maxTokens: number;
  maxRounds: number;
  system: TextBlockParam[];
  messages: MessageParam[];
  tools: ToolUnion[];
  controller: ReadableStreamDefaultController<Uint8Array>;
  // Execute one local (client-side) tool and return its result string.
  // Server-side tools (web_search) are resolved by the API in-turn and
  // never reach this callback.
  runTool: (name: string, input: unknown) => Promise<string>;
  // Optional terminal tool. When the model calls it, the run ends:
  // `toEvents` turns its input into events to emit (e.g. a `proposal`),
  // and no tool_result is fed back. Used by the scan flow's
  // `propose_knife` — the forced structured output that closes the loop.
  terminal?: {
    name: string;
    toEvents: (input: unknown) => StreamEvent[];
  };
}

// Drives the Anthropic streaming tool-use loop, translating SDK stream
// events into our `StreamEvent` NDJSON and dispatching local tool calls.
// Mutates `messages` as the conversation grows. The caller owns the
// ReadableStream and closes the controller; this only enqueues.
export async function runAgentStream({
  client,
  model,
  maxTokens,
  maxRounds,
  system,
  messages,
  tools,
  controller,
  runTool,
  terminal,
}: AgentStreamArgs): Promise<void> {
  const seenCitations = new Set<string>();
  let totalInput = 0;
  let totalOutput = 0;

  for (let round = 0; round < maxRounds; round++) {
    const events = client.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
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
            encode({ type: "tool_start", id: block.id, name: block.name }),
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
        encode({ type: "done", usage: { input: totalInput, output: totalOutput } }),
      );
      return;
    }

    const toolUseBlocks = final.content.filter(
      (b): b is ToolUseBlock => b.type === "tool_use",
    );
    if (toolUseBlocks.length === 0) {
      controller.enqueue(
        encode({ type: "done", usage: { input: totalInput, output: totalOutput } }),
      );
      return;
    }

    // Terminal tool short-circuits the loop: emit its events, mark the
    // chip done, and finish without feeding a result back to the model.
    if (terminal) {
      const terminalBlock = toolUseBlocks.find((b) => b.name === terminal.name);
      if (terminalBlock) {
        for (const ev of terminal.toEvents(terminalBlock.input)) {
          controller.enqueue(encode(ev));
        }
        controller.enqueue(
          encode({
            type: "tool_end",
            id: terminalBlock.id,
            name: terminalBlock.name,
            ok: true,
          }),
        );
        controller.enqueue(
          encode({
            type: "done",
            usage: { input: totalInput, output: totalOutput },
          }),
        );
        return;
      }
    }

    const toolResults: ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      try {
        const result = await runTool(block.name, block.input);
        controller.enqueue(
          encode({ type: "tool_end", id: block.id, name: block.name, ok: true }),
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      } catch (err) {
        controller.enqueue(
          encode({ type: "tool_end", id: block.id, name: block.name, ok: false }),
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: err instanceof Error ? err.message : "tool execution failed",
          is_error: true,
        });
      }
    }

    messages.push({ role: "assistant", content: final.content as ContentBlockParam[] });
    messages.push({ role: "user", content: toolResults });
  }

  controller.enqueue(
    encode({
      type: "error",
      message: `tool-use loop exceeded ${maxRounds} rounds`,
    }),
  );
}
