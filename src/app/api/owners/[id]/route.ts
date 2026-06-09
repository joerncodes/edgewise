import { ZodError } from "zod";
import { getStorage, OwnerInputSchema } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const owner = await getStorage().getOwner(id);
    if (!owner) return notFound("owner not found");
    return json({ owner });
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
    const existing = await storage.getOwner(id);
    if (!existing) return notFound("owner not found");

    const merged = OwnerInputSchema.parse({ ...existing, ...body });
    const updated = {
      ...existing,
      name: merged.name,
      contact: merged.contact ?? "",
      notes: merged.notes ?? "",
      updatedAt: nowIso(),
    };
    await storage.saveOwner(updated);
    return json({ owner: updated });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const storage = getStorage();
    const knives = await storage.listKnives();
    const inUse = knives.filter((k) => k.ownerId === id);
    if (inUse.length > 0) {
      return conflict(
        `owner has ${inUse.length} knife(s); reassign or delete them first`,
      );
    }
    const ok = await storage.deleteOwner(id);
    if (!ok) return notFound("owner not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
