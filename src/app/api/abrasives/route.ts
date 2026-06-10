import { ZodError } from "zod";
import { getStorage, slugify, AbrasiveInputSchema, type Abrasive } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, nowIso, serverError } from "@/lib/http";

export async function GET() {
  try {
    const abrasives = await getStorage().listAbrasives();
    return json({ abrasives });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const input = AbrasiveInputSchema.parse(body);
    const storage = getStorage();
    const id = input.id?.trim() || slugify(`${input.name} ${input.grit}`);
    if (await storage.getAbrasive(id)) {
      return conflict(`abrasive already exists: ${id}`);
    }
    const now = nowIso();
    const abrasive: Abrasive = {
      id,
      name: input.name,
      grit: input.grit,
      type: input.type ?? "",
      compound: input.compound ?? "",
      substrate: input.substrate ?? "",
      notes: input.notes ?? "",
      images: [],
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveAbrasive(abrasive);
    return json({ abrasive }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
