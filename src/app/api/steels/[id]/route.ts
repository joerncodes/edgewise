import { ZodError } from "zod";
import { getStorage, slugify, SteelInputSchema } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const steel = await getStorage().getSteel(id);
    if (!steel) return notFound("steel not found");
    return json({ steel });
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
    const existing = await storage.getSteel(id);
    if (!existing) return notFound("steel not found");

    const merged = SteelInputSchema.parse({ ...existing, ...body });
    const updated = {
      ...existing,
      name: merged.name,
      composition: merged.composition ?? "",
      notes: merged.notes ?? "",
      updatedAt: nowIso(),
    };
    await storage.saveSteel(updated);
    return json({ steel: updated });
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
    const inUse = knives.filter((k) => slugify((k.steel ?? "").trim()) === id);
    if (inUse.length > 0) {
      return conflict(
        `steel is used by ${inUse.length} knife(s); change or clear their steel field first`,
      );
    }
    const ok = await storage.deleteSteel(id);
    if (!ok) return notFound("steel not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
