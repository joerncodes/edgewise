import { PATCH as patchKnifeRoute } from "@/app/api/knives/[id]/route";
import { POST as createSessionRoute } from "@/app/api/knives/[id]/sessions/route";
import { PATCH as patchSessionRoute } from "@/app/api/knives/[id]/sessions/[date]/route";
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
  {
    name: "append_knife_note",
    description:
      "Append a short note to the knife's notes field. Use when the user makes an observation about the knife mid-chat ('the convex didn't take the 1k well', 'handle scales loosened again'). The user's request to add IS the consent — do not echo the note back and ask 'good to go?'. This tool is APPEND-ONLY: it never rewrites or deletes existing notes. If the user asks to rewrite or delete the notes, tell them to use the detail page's inline edit instead. Pass the user's wording verbatim when they quote a specific sentence; otherwise paraphrase their observation into one short sentence matching the existing notes' tone. Do not add a date prefix unless the user asked for one.",
    input_schema: {
      type: "object",
      properties: {
        note: {
          type: "string",
          description:
            "The note text to append. One sentence is typical. Must not be empty.",
        },
      },
      required: ["note"],
    },
  },
  {
    name: "edit_session",
    description:
      "Edit an existing sharpening session on the knife in view. The user's edit request IS the consent — do not echo the new values back and ask 'good to go?'. ONLY include the fields you are changing; omit angle if angle isn't changing, omit abrasives if abrasives aren't changing. The date identifies which session to edit and is NOT mutable — to move a session to a different date, delete and re-log. Pass null (not omitted) to notes / rating / abrasives to CLEAR that field. If you are setting abrasives, call list_abrasives first in the same turn to resolve names to real ids — never invent slugs. A 404 means the session was deleted on the detail page since the system prompt was built; call get_knife to refresh, do not retry blind.",
    input_schema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "ISO date YYYY-MM-DD of the session to edit. Picked from the session history in the system prompt. Cannot be changed.",
        },
        angle: {
          type: "number",
          description: "New per-side angle. Omit to leave unchanged.",
        },
        abrasives: {
          type: ["array", "null"],
          items: { type: "string" },
          description:
            "Replacement abrasive chain (ids from list_abrasives, coarse → fine). null clears the chain. Omit to leave unchanged.",
        },
        notes: {
          type: ["string", "null"],
          description:
            "Replacement notes. null clears. Omit to leave unchanged.",
        },
        rating: {
          type: ["number", "null"],
          description:
            "Replacement rating 1–5. null clears. Omit to leave unchanged.",
        },
      },
      required: ["date"],
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
    case "append_knife_note": {
      // Append-only by design: read current notes, glue the new note
      // on with a paragraph break, PATCH the whole notes field. The
      // tool can never lose existing content. Knife id from ctx.
      const note =
        typeof input.note === "string" ? input.note.trim() : "";
      if (!note) {
        return JSON.stringify({
          error:
            "note must not be empty — call again with content, or tell the user you have nothing to add",
        });
      }

      const knife = await storage.getKnife(ctx.knifeId);
      if (!knife) {
        return JSON.stringify({ error: "knife not found" });
      }
      const existing = (knife.notes ?? "").trimEnd();
      const next = existing ? `${existing}\n\n${note}` : note;

      const fakeReq = new Request(
        `http://internal/api/knives/${encodeURIComponent(ctx.knifeId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: next }),
        },
      );
      const res = await patchKnifeRoute(fakeReq, {
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
      return JSON.stringify({ ok: true, appended: note });
    }
    case "edit_session": {
      // Mirrors log_session: route through the PATCH handler
      // in-process, knife id bound from ctx. The PATCH schema is
      // .strict(), so we only forward known keys — and only those
      // the model actually set, so omitted fields stay untouched.
      const date = typeof input.date === "string" ? input.date : "";
      if (!date) return JSON.stringify({ error: "date is required" });

      const body: Record<string, unknown> = {};
      if (typeof input.angle === "number") body.angle = input.angle;
      // null is meaningful (clear). undefined means "not in payload".
      if ("notes" in input) body.notes = input.notes;
      if ("rating" in input) body.rating = input.rating;
      if ("abrasives" in input) body.abrasives = input.abrasives;

      if (Object.keys(body).length === 0) {
        return JSON.stringify({
          error:
            "no changes specified — include at least one of angle/notes/rating/abrasives",
        });
      }

      const fakeReq = new Request(
        `http://internal/api/knives/${encodeURIComponent(ctx.knifeId)}/sessions/${encodeURIComponent(date)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const res = await patchSessionRoute(fakeReq, {
        params: Promise.resolve({ id: ctx.knifeId, date }),
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
      const knife = (payload as { knife: Knife } | null)?.knife;
      const edited = knife?.sessions.find((s) => s.date === date);
      return JSON.stringify({
        ok: true,
        session: edited ?? { date },
      });
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
