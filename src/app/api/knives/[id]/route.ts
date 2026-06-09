import { ZodError } from "zod";
import { getStorage, KnifeInputSchema } from "@/lib/storage";
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

    const merged = KnifeInputSchema.parse({
      ...existing,
      ...body,
    });

    if (merged.ownerId !== existing.ownerId) {
      const owner = await storage.getOwner(merged.ownerId);
      if (!owner) return badRequest(`owner not found: ${merged.ownerId}`);
    }

    const updated = {
      ...existing,
      name: merged.name,
      ownerId: merged.ownerId,
      manufacturer: merged.manufacturer ?? "",
      steel: merged.steel ?? "",
      type: merged.type ?? "",
      notes: merged.notes ?? "",
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
