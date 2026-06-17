import { POST as createSessionRoute } from "@/app/api/knives/[id]/sessions/route";
import { getStorage } from "@/lib/storage";
import type { Knife } from "@/lib/storage/types";

export interface ToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const LOCAL_TOOLS: ToolDef[] = [
  {
    name: "list_knives",
    description:
      "List every knife in the user's Edgewise log. Returns a compact summary per knife — id, name, manufacturer, steel, type, owner id, total session count, and last sharpening date/angle. Use this when the user asks about knives other than the one currently in view, or wants to compare across the collection.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_knife",
    description:
      "Get the full record for one knife by id, including every sharpening session with date, angle, abrasive progression, notes, and rating. Use after list_knives when you need detail on a specific entry.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The knife id (slug)." },
      },
      required: ["id"],
    },
  },
  {
    name: "list_abrasives",
    description:
      "List every abrasive (stone, strop, plate) the user owns, sorted by grit. Use when recommending a progression or answering inventory questions.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_abrasive",
    description:
      "Get the full record for one abrasive by id — name, grit, type, compound/substrate, and notes.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The abrasive id (slug)." },
      },
      required: ["id"],
    },
  },
  {
    name: "log_session",
    description:
      "Log a sharpening session on the knife currently in view. Call this in the SAME turn the user asks to log — do not write a 'here's what I'll log, good to go?' message first. The user's request to log IS the consent. Sequence in one turn: list_abrasives → log_session → short confirmation reply. Date is YYYY-MM-DD (default today). Angle in degrees (e.g. 17). Abrasives must be ids from list_abrasives in the order they were used (coarse → fine); resolve names like 'Shapton 1k' to the real id by matching name/grit/type — never invent or guess slugs. Notes and rating (1–5) are optional. Returns the updated knife on success; a 409 means a session is already logged for that date.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "ISO date YYYY-MM-DD. Default to today if the user didn't specify.",
        },
        angle: {
          type: "number",
          description: "Per-side angle in degrees, e.g. 17.",
        },
        abrasives: {
          type: "array",
          items: { type: "string" },
          description:
            "Abrasive ids from list_abrasives, in progression order (coarse to fine). Never invent slugs.",
        },
        notes: { type: "string", description: "Optional free-text notes." },
        rating: {
          type: "number",
          description: "Optional self-rating 1–5 of how the edge came out.",
        },
      },
      required: ["date", "angle"],
    },
  },
];

function knifeSummary(k: Knife) {
  const sorted = [...k.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const last = sorted[0];
  return {
    id: k.id,
    name: k.name,
    manufacturer: k.manufacturer || null,
    steel: k.steel || null,
    type: k.type || null,
    subtype: k.subtype || null,
    ownerId: k.ownerId,
    sessionCount: k.sessions.length,
    lastSession: last
      ? { date: last.date, angle: last.angle, rating: last.rating ?? null }
      : null,
  };
}

export interface ToolContext {
  // The knife the chat is anchored to. Write tools are scoped to it
  // so the model can't accidentally mutate a different record.
  knifeId: string;
}

export async function runTool(
  name: string,
  rawInput: unknown,
  ctx: ToolContext,
): Promise<string> {
  const input = (rawInput ?? {}) as Record<string, unknown>;
  const storage = getStorage();

  switch (name) {
    case "list_knives": {
      const knives = await storage.listKnives();
      return JSON.stringify(knives.map(knifeSummary));
    }
    case "get_knife": {
      const id = typeof input.id === "string" ? input.id : "";
      if (!id) return JSON.stringify({ error: "id is required" });
      const knife = await storage.getKnife(id);
      if (!knife) return JSON.stringify({ error: `knife not found: ${id}` });
      return JSON.stringify(knife);
    }
    case "list_abrasives": {
      const abrasives = await storage.listAbrasives();
      const sorted = [...abrasives].sort((a, b) => a.grit - b.grit);
      return JSON.stringify(
        sorted.map((a) => ({
          id: a.id,
          name: a.name,
          grit: a.grit,
          type: a.type || null,
          compound: a.compound || null,
          substrate: a.substrate || null,
        })),
      );
    }
    case "get_abrasive": {
      const id = typeof input.id === "string" ? input.id : "";
      if (!id) return JSON.stringify({ error: "id is required" });
      const abrasive = await storage.getAbrasive(id);
      if (!abrasive) {
        return JSON.stringify({ error: `abrasive not found: ${id}` });
      }
      return JSON.stringify(abrasive);
    }
    case "log_session": {
      // Route through the existing API rather than touching storage —
      // same write path the UI uses (ADR-0013). Calling the route
      // handler in-process keeps it one module hop and avoids any
      // auth-header juggling. The knife id comes from ctx, never from
      // the model, so the tool can only ever write to the knife in
      // view.
      const body: Record<string, unknown> = {};
      if (typeof input.date === "string") body.date = input.date;
      if (typeof input.angle === "number") body.angle = input.angle;
      if (Array.isArray(input.abrasives)) body.abrasives = input.abrasives;
      if (typeof input.notes === "string") body.notes = input.notes;
      if (typeof input.rating === "number") body.rating = input.rating;

      const fakeReq = new Request(
        `http://internal/api/knives/${encodeURIComponent(ctx.knifeId)}/sessions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const res = await createSessionRoute(fakeReq, {
        params: Promise.resolve({ id: ctx.knifeId }),
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        return JSON.stringify({
          error:
            payload && typeof payload === "object" && "error" in payload
              ? (payload as { error: string }).error
              : `request failed (${res.status})`,
          status: res.status,
        });
      }
      // The API returns { knife }; trim it to what the model needs.
      const knife = (payload as { knife: Knife } | null)?.knife;
      return JSON.stringify({
        ok: true,
        session: {
          date: typeof input.date === "string" ? input.date : null,
          angle: typeof input.angle === "number" ? input.angle : null,
        },
        sessionCount: knife?.sessions.length ?? null,
      });
    }
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` });
  }
}
