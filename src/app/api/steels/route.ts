import { ZodError } from "zod";
import { getStorage, slugify, SteelInputSchema, type Steel } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, nowIso, serverError } from "@/lib/http";

export async function GET() {
  try {
    const steels = await getStorage().listSteels();
    return json({ steels });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const input = SteelInputSchema.parse(body);
    const storage = getStorage();
    const id = input.id?.trim() || slugify(input.name);
    if (await storage.getSteel(id)) {
      return conflict(`steel already exists: ${id}`);
    }
    const now = nowIso();
    const steel: Steel = {
      id,
      name: input.name,
      composition: input.composition ?? "",
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveSteel(steel);
    return json({ steel }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
