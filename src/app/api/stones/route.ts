import { ZodError } from "zod";
import { getStorage, slugify, StoneInputSchema, type Stone } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, nowIso, serverError } from "@/lib/http";

export async function GET() {
  try {
    const stones = await getStorage().listStones();
    return json({ stones });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const input = StoneInputSchema.parse(body);
    const storage = getStorage();
    const id = input.id?.trim() || slugify(`${input.name} ${input.grit}`);
    if (await storage.getStone(id)) {
      return conflict(`stone already exists: ${id}`);
    }
    const now = nowIso();
    const stone: Stone = {
      id,
      name: input.name,
      grit: input.grit,
      type: input.type ?? "",
      notes: input.notes ?? "",
      images: [],
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveStone(stone);
    return json({ stone }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
