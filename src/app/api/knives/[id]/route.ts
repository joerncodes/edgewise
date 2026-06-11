import { ZodError } from "zod";
import { getStorage, KnifeInputSchema } from "@/lib/storage";
import { nextBacklogPosition } from "@/lib/backlog";
import { badRequest, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const knife = await getStorage().getKnife(id);
    if (!knife) return notFound("knife not found");
    return json({ knife });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");

    const storage = getStorage();
    const existing = await storage.getKnife(id);
    if (!existing) return notFound("knife not found");

    // `backlogPosition: null` is the documented clear signal. Strip it
    // before parse so the rest of the input still validates.
    const rawBody = body as Record<string, unknown>;
    const explicitPositionClear = rawBody.backlogPosition === null;
    const sanitizedBody = explicitPositionClear
      ? { ...rawBody, backlogPosition: undefined }
      : rawBody;

    const merged = KnifeInputSchema.parse({
      ...existing,
      ...sanitizedBody,
    });

    if (merged.ownerId !== existing.ownerId) {
      const owner = await storage.getOwner(merged.ownerId);
      if (!owner) return badRequest(`owner not found: ${merged.ownerId}`);
    }

    // Decide the new backlog position. Rules (see backlog-manual-order.md):
    // - backlog false → no position
    // - explicit `backlogPosition: null` → clear
    // - body provides a position → honour it
    // - flagged into backlog without a position → auto-append at the end
    // - otherwise keep whatever was there
    let backlogPosition: number | undefined = undefined;
    if (merged.backlog === true) {
      if (!explicitPositionClear) {
        if (typeof merged.backlogPosition === "number") {
          backlogPosition = merged.backlogPosition;
        } else if (existing.backlog !== true) {
          const all = await storage.listKnives();
          backlogPosition = nextBacklogPosition(all);
        }
      }
    }

    const updated = {
      ...existing,
      name: merged.name,
      ownerId: merged.ownerId,
      manufacturer: merged.manufacturer ?? "",
      steel: merged.steel ?? "",
      type: merged.type ?? "",
      notes: merged.notes ?? "",
      backlog: merged.backlog ?? false,
      backlogPosition,
      onLoan: merged.onLoan ?? false,
      sessions: merged.sessions ?? [],
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
    const { id } = await params;
    const ok = await getStorage().deleteKnife(id);
    if (!ok) return notFound("knife not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
