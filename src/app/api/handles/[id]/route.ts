import { ZodError } from "zod";
import { getStorage, slugify, HandleInputSchema } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const handle = await getStorage().getHandle(id);
    if (!handle) return notFound("handle not found");
    return json({ handle });
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
    const existing = await storage.getHandle(id);
    if (!existing) return notFound("handle not found");

    const merged = HandleInputSchema.parse({ ...existing, ...body });
    const updated = {
      ...existing,
      name: merged.name,
      notes: merged.notes ?? "",
      updatedAt: nowIso(),
    };
    await storage.saveHandle(updated);
    return json({ handle: updated });
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
    const inUse = knives.filter((k) => slugify((k.handle ?? "").trim()) === id);
    if (inUse.length > 0) {
      return conflict(
        `handle is used by ${inUse.length} knife(s); change or clear their handle field first`,
      );
    }
    const ok = await storage.deleteHandle(id);
    if (!ok) return notFound("handle not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
