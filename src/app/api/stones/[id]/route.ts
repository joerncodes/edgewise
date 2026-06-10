import { ZodError } from "zod";
import { getStorage, StoneInputSchema } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const stone = await getStorage().getStone(id);
    if (!stone) return notFound("stone not found");
    return json({ stone });
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
    const existing = await storage.getStone(id);
    if (!existing) return notFound("stone not found");

    const merged = StoneInputSchema.parse({ ...existing, ...body });
    const updated = {
      ...existing,
      name: merged.name,
      grit: merged.grit,
      type: merged.type ?? "",
      notes: merged.notes ?? "",
      updatedAt: nowIso(),
    };
    await storage.saveStone(updated);
    return json({ stone: updated });
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
    const inUse = knives.filter((k) =>
      k.sessions.some((s) => s.stones?.includes(id)),
    );
    if (inUse.length > 0) {
      return conflict(
        `stone is referenced by ${inUse.length} knife(s); remove from those sessions first`,
      );
    }
    const ok = await storage.deleteStone(id);
    if (!ok) return notFound("stone not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
