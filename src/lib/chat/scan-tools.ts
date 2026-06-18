import { getStorage } from "@/lib/storage";
import { LOCAL_TOOLS, runTool, type ToolDef } from "@/lib/chat/tools";

// The single fields propose_knife may suggest — a subset of
// KnifeInputSchema. Kept here as one list so the tool schema, the
// sanitizer, and the client form stay in lockstep. `name` is the only
// field the model is asked to always provide; everything else is left
// blank when it isn't confident (empty vs. present is the only
// confidence signal we surface — see the todo's "per-field confidence"
// note).
export const SUGGESTION_KEYS = [
  "name",
  "manufacturer",
  "steel",
  "handle",
  "type",
  "subtype",
  "notes",
  "ownerId",
] as const;

export const PROPOSE_KNIFE_TOOL_NAME = "propose_knife";

// Max characters of fetched page text handed back to the model. A
// product page rendered to text is usually a few KB; this caps a
// pathological page without truncating a normal one.
const FETCH_URL_MAX_CHARS = 12_000;
const FETCH_TIMEOUT_MS = 10_000;

const proposeKnifeTool: ToolDef = {
  name: PROPOSE_KNIFE_TOOL_NAME,
  description:
    "Submit the final suggested knife record. Call this EXACTLY ONCE as your last action, after you have looked at the photo and (optionally) checked the user's steel/handle/manufacturer libraries and the web. This is the structured output — there is no separate text answer. Only include a field when you are reasonably confident; OMIT fields you are unsure about rather than guessing (the user fills blanks in). `name` is required. For manufacturer/steel/handle, prefer the exact spelling the user already uses (from list_manufacturers / list_steels / list_handles) over a new variant. Put steel composition and a sentence on how it sharpens into `notes`, and cite where a non-obvious claim came from.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Short display name for the knife, e.g. 'Wüsthof Classic Chef 20cm' or 'unknown santoku'. Required.",
      },
      manufacturer: {
        type: "string",
        description:
          "Maker/brand. Match an existing value from list_manufacturers when one fits.",
      },
      steel: {
        type: "string",
        description:
          "Blade steel. Match a registered steel name from list_steels when one fits.",
      },
      handle: {
        type: "string",
        description:
          "Handle material. Match a registered handle from list_handles when one fits.",
      },
      type: {
        type: "string",
        description:
          "Knife type, e.g. 'Chef's Knife', 'Pocket Knife', 'Santoku'.",
      },
      subtype: {
        type: "string",
        description:
          "Free-text qualifier on type, e.g. 'Japanese' / 'Western', 'folder' / 'fixed blade'.",
      },
      notes: {
        type: "string",
        description:
          "Short paragraph: steel composition, hardness if known, and one sentence on how it sharpens. Cite sources for non-obvious claims.",
      },
      ownerId: {
        type: "string",
        description:
          "Owner id from list_owners — ONLY if the photo carries an owner-identifying detail (a name on tape/sticky note). Otherwise omit; the user picks the owner.",
      },
    },
    required: ["name"],
  },
};

const fetchUrlTool: ToolDef = {
  name: "fetch_url",
  description:
    "Fetch a web page and return its visible text. Use this when the user supplied a product/source URL, or when web_search turns up a page whose details you need. http(s) only. Returns plain text with markup stripped, truncated if very long.",
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Absolute http(s) URL to fetch.",
      },
    },
    required: ["url"],
  },
};

const listOwnersTool: ToolDef = {
  name: "list_owners",
  description:
    "List the people the user sharpens knives for — id and name. Only call this if the photo shows an owner-identifying detail (a name written on tape or a sticky note) that you want to resolve to an existing owner id for the ownerId field. Most scans skip this.",
  input_schema: { type: "object", properties: {} },
};

// Read tools the scan agent borrows from the shared chat tool set. The
// write tools (log_session, etc.) are deliberately excluded — a scan
// only ever reads.
const SHARED_SCAN_TOOL_NAMES = [
  "list_knives",
  "list_steels",
  "list_handles",
  "list_manufacturers",
];

// The local (client-side) tools exposed to the scan agent. The
// web_search server tool is added by the route. propose_knife is the
// terminal tool — present in this list so its schema reaches the model,
// but the route captures its call rather than executing it here.
export const SCAN_TOOLS: ToolDef[] = [
  ...LOCAL_TOOLS.filter((t) => SHARED_SCAN_TOOL_NAMES.includes(t.name)),
  listOwnersTool,
  fetchUrlTool,
  proposeKnifeTool,
];

// Keep only the allowed string fields, trimmed and non-empty. Whatever
// the model put in propose_knife becomes form defaults; the form's Zod
// schema is the real validation gate, so this just strips noise.
export function sanitizeSuggestion(
  input: unknown,
): Record<string, string> {
  const obj = (input ?? {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of SUGGESTION_KEYS) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) out[key] = v.trim();
  }
  return out;
}

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "::1" || h === "0.0.0.0") return true;
  // IPv4 private / loopback / link-local ranges. Crude but enough for a
  // single-user homelab — the goal is to stop the model from poking the
  // host's own network, not to be an airtight SSRF firewall.
  if (/^127\./.test(h)) return true;
  if (/^10\./.test(h)) return true;
  if (/^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function runFetchUrl(input: unknown): Promise<string> {
  const url = typeof (input as { url?: unknown })?.url === "string"
    ? (input as { url: string }).url.trim()
    : "";
  if (!url) return JSON.stringify({ error: "url is required" });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return JSON.stringify({ error: `invalid url: ${url}` });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return JSON.stringify({ error: "only http(s) URLs are allowed" });
  }
  if (isBlockedHost(parsed.hostname)) {
    return JSON.stringify({ error: "refusing to fetch a private/loopback host" });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "Edgewise-Scan/1.0" },
    });
    if (!res.ok) {
      return JSON.stringify({ error: `fetch failed (${res.status})`, url: parsed.toString() });
    }
    const ctype = res.headers.get("content-type") ?? "";
    const raw = await res.text();
    const text = ctype.includes("html") ? htmlToText(raw) : raw.trim();
    const truncated = text.length > FETCH_URL_MAX_CHARS;
    return JSON.stringify({
      url: parsed.toString(),
      truncated,
      text: truncated ? text.slice(0, FETCH_URL_MAX_CHARS) : text,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.name === "AbortError"
        ? "fetch timed out"
        : err instanceof Error
          ? err.message
          : "fetch failed";
    return JSON.stringify({ error: message, url: parsed.toString() });
  } finally {
    clearTimeout(timer);
  }
}

// Dispatch one scan tool call. propose_knife never reaches here — the
// route treats it as the terminal tool. Facet/list reads delegate to
// the shared runTool (with no knife scope, since scans don't mutate).
export async function runScanTool(
  name: string,
  input: unknown,
): Promise<string> {
  const storage = getStorage();
  switch (name) {
    case "fetch_url":
      return runFetchUrl(input);
    case "list_owners": {
      const owners = await storage.listOwners();
      return JSON.stringify(owners.map((o) => ({ id: o.id, name: o.name })));
    }
    default:
      // list_knives / list_steels / list_handles / list_manufacturers —
      // reuse the chat tool runner. knifeId is unused by these reads.
      return runTool(name, input, { knifeId: "" });
  }
}
