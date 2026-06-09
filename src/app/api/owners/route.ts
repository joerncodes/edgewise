import { ZodError } from "zod";
import { getStorage, slugify, OwnerInputSchema, type Owner } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, nowIso, serverError } from "@/lib/http";

export async function GET() {
  try {
    const owners = await getStorage().listOwners();
    return json({ owners });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const input = OwnerInputSchema.parse(body);
    const storage = getStorage();
    const id = input.id?.trim() || slugify(input.name);
    if (await storage.getOwner(id)) {
      return conflict(`owner already exists: ${id}`);
    }
    const now = nowIso();
    const owner: Owner = {
      id,
      name: input.name,
      contact: input.contact ?? "",
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveOwner(owner);
    return json({ owner }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
