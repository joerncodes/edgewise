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

export async function runTool(
  name: string,
  rawInput: unknown,
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
    default:
      return JSON.stringify({ error: `unknown tool: ${name}` });
  }
}
