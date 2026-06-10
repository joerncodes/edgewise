import { ZodError, z } from "zod";
import { getStorage } from "@/lib/storage";
import { badRequest, fromZod, json, nowIso, serverError } from "@/lib/http";

const BodySchema = z.object({
  ids: z.array(z.string().min(1)),
});

// Rewrite `backlogPosition` for the given knife IDs as 1, 2, 3, …
// Body shape: `{ "ids": ["a", "b", "c"] }`. Every ID must be a knife
// that is currently `backlog: true` and must appear at most once;
// otherwise the request is rejected without touching anything. The
// resulting positions are integers — the UI never deals with floats.
//
// Knives flagged `backlog: true` that aren't in the request keep their
// existing position (or are auto-appended on read via `sortByPosition`).
// See docs/todos/backlog-manual-order.md.
export async function POST(req: Request) {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== "object") return badRequest("body must be JSON");
    const { ids } = BodySchema.parse(raw);

    if (new Set(ids).size !== ids.length) {
      return badRequest("duplicate ids in request");
    }

    const storage = getStorage();
    const all = await storage.listKnives();
    const byId = new Map(all.map((k) => [k.id, k]));

    for (const id of ids) {
      const k = byId.get(id);
      if (!k) return badRequest(`knife not found: ${id}`);
      if (k.backlog !== true) return badRequest(`knife not in backlog: ${id}`);
    }

    const now = nowIso();
    const updatedKnives = [];
    for (let i = 0; i < ids.length; i++) {
      const k = byId.get(ids[i])!;
      const nextPosition = i + 1;
      if (k.backlogPosition === nextPosition) continue;
      const updated = { ...k, backlogPosition: nextPosition, updatedAt: now };
      await storage.saveKnife(updated);
      updatedKnives.push(updated);
    }

    return json({ updated: updatedKnives.length });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
