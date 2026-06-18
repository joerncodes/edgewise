import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { badRequest } from "@/lib/http";
import { encode, runAgentStream } from "@/lib/chat/agent-stream";
import { buildKnifeScanSystemPrompt } from "@/lib/chat/scan-prompt";
import {
  PROPOSE_KNIFE_TOOL_NAME,
  SCAN_TOOLS,
  runScanTool,
  sanitizeSuggestion,
} from "@/lib/chat/scan-tools";
import { IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from "@/lib/storage/types";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
const WEB_SEARCH_MAX_USES = 5;
const MAX_TOOL_ROUNDS = 8;

function normalizeSourceUrl(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "scan is disabled — ANTHROPIC_API_KEY not set" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return badRequest("expected multipart/form-data");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return badRequest("missing image file under 'file'");
  }
  const mime = file.type;
  if (!(mime in IMAGE_MIME_TYPES)) {
    return badRequest(
      `unsupported image type: ${mime || "unknown"} (allowed: ${Object.keys(IMAGE_MIME_TYPES).join(", ")})`,
    );
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return badRequest(`image too large (max ${MAX_IMAGE_BYTES} bytes)`);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const base64 = bytes.toString("base64");
  const sourceUrl = normalizeSourceUrl(form.get("sourceUrl"));

  const systemPrompt = buildKnifeScanSystemPrompt({ sourceUrl });
  const client = new Anthropic({ apiKey });

  const messages: MessageParam[] = [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: mime as keyof typeof IMAGE_MIME_TYPES,
            data: base64,
          },
        },
        {
          type: "text",
          text: "Here is a photo of a knife I want to add to my log. Identify what you can and call propose_knife with the suggested record.",
        },
      ],
    },
  ];

  const tools = [
    {
      type: "web_search_20250305" as const,
      name: "web_search" as const,
      max_uses: WEB_SEARCH_MAX_USES,
    },
    ...SCAN_TOOLS,
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
          runTool: runScanTool,
          terminal: {
            name: PROPOSE_KNIFE_TOOL_NAME,
            toEvents: (input) => [
              { type: "proposal", suggestion: sanitizeSuggestion(input) },
            ],
          },
        });
      } catch (err) {
        console.error("[scan]", err);
        const message =
          err instanceof Error ? err.message : "scan stream failed";
        // The client may have disconnected (closing the controller),
        // which is what threw in the first place — don't double-fault.
        try {
          controller.enqueue(encode({ type: "error", message }));
        } catch {
          /* controller already closed */
        }
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
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
