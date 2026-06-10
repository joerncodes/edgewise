import { ZodError } from "zod";
import { getStorage, AbrasiveInputSchema } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const abrasive = await getStorage().getAbrasive(id);
    if (!abrasive) return notFound("abrasive not found");
    return json({ abrasive });
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
    const existing = await storage.getAbrasive(id);
    if (!existing) return notFound("abrasive not found");

    const merged = AbrasiveInputSchema.parse({ ...existing, ...body });
    const updated = {
      ...existing,
      name: merged.name,
      grit: merged.grit,
      type: merged.type ?? "",
      compound: merged.compound ?? "",
      substrate: merged.substrate ?? "",
      notes: merged.notes ?? "",
      updatedAt: nowIso(),
    };
    await storage.saveAbrasive(updated);
    return json({ abrasive: updated });
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
      k.sessions.some((s) => s.abrasives?.includes(id)),
    );
    if (inUse.length > 0) {
      return conflict(
        `abrasive is referenced by ${inUse.length} knife(s); remove from those sessions first`,
      );
    }
    const ok = await storage.deleteAbrasive(id);
    if (!ok) return notFound("abrasive not found");
    return new Response(null, { status: 204 });
  } catch (err) {
    return serverError(err);
  }
}
