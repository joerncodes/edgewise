import { ZodError } from "zod";
import { getStorage, slugify, KnifeInputSchema, type Knife } from "@/lib/storage";
import { nextBacklogPosition } from "@/lib/backlog";
import { badRequest, conflict, fromZod, json, nowIso, serverError } from "@/lib/http";

export async function GET() {
  try {
    const knives = await getStorage().listKnives();
    return json({ knives });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const input = KnifeInputSchema.parse(body);
    const storage = getStorage();
    const owner = await storage.getOwner(input.ownerId);
    if (!owner) return badRequest(`owner not found: ${input.ownerId}`);
    const id = input.id?.trim() || slugify(input.name);
    if (await storage.getKnife(id)) {
      return conflict(`knife already exists: ${id}`);
    }
    const now = nowIso();
    const backlog = input.backlog ?? false;
    let backlogPosition: number | undefined = backlog
      ? input.backlogPosition
      : undefined;
    if (backlog && backlogPosition === undefined) {
      // Auto-append at the end of the queue. See backlog-manual-order.md.
      backlogPosition = nextBacklogPosition(await storage.listKnives());
    }
    const knife: Knife = {
      id,
      name: input.name,
      ownerId: input.ownerId,
      manufacturer: input.manufacturer ?? "",
      steel: input.steel ?? "",
      handle: input.handle ?? "",
      type: input.type ?? "",
      subtype: input.subtype ?? "",
      notes: input.notes ?? "",
      backlog,
      backlogPosition,
      onLoan: input.onLoan ?? false,
      sessions: input.sessions ?? [],
      images: [],
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveKnife(knife);
    return json({ knife }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
