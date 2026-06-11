import { z, ZodError } from "zod";
import { getStorage } from "@/lib/storage";
import { badRequest, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; date: string }> };

// Partial-update shape. Omitted fields stay; explicit `null` clears the
// optional ones (notes/rating/abrasives). `date` is the primary key and
// is not mutable — delete and re-add to change it.
const SessionPatchSchema = z
  .object({
    angle: z.number().positive().max(45).optional(),
    notes: z.string().nullable().optional(),
    rating: z.number().min(1).max(5).nullable().optional(),
    abrasives: z.array(z.string().min(1)).nullable().optional(),
  })
  .strict();

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id, date } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const patch = SessionPatchSchema.parse(body);

    const storage = getStorage();
    const knife = await storage.getKnife(id);
    if (!knife) return notFound("knife not found");

    const idx = knife.sessions.findIndex((s) => s.date === date);
    if (idx === -1) return notFound("session not found");

    const current = knife.sessions[idx];
    const next = {
      ...current,
      ...(patch.angle !== undefined ? { angle: patch.angle } : {}),
      ...(patch.notes !== undefined ? { notes: patch.notes ?? "" } : {}),
      ...(patch.rating !== undefined ? { rating: patch.rating ?? undefined } : {}),
      ...(patch.abrasives !== undefined
        ? { abrasives: patch.abrasives ?? undefined }
        : {}),
    };

    if (next.abrasives?.length) {
      const missing: string[] = [];
      for (const abrasiveId of next.abrasives) {
        if (!(await storage.getAbrasive(abrasiveId))) missing.push(abrasiveId);
      }
      if (missing.length > 0) {
        return badRequest(`abrasive(s) not found: ${missing.join(", ")}`);
      }
    }

    const sessions = knife.sessions.slice();
    sessions[idx] = next;
    const updated = {
      ...knife,
      sessions,
      updatedAt: nowIso(),
    };
    await storage.saveKnife(updated);
    return json({ knife: updated });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id, date } = await params;
    const storage = getStorage();
    const knife = await storage.getKnife(id);
    if (!knife) return notFound("knife not found");

    const idx = knife.sessions.findIndex((s) => s.date === date);
    if (idx === -1) return notFound("session not found");

    const updated = {
      ...knife,
      sessions: knife.sessions.filter((_, i) => i !== idx),
      updatedAt: nowIso(),
    };
    await storage.saveKnife(updated);
    return json({ knife: updated });
  } catch (err) {
    return serverError(err);
  }
}
