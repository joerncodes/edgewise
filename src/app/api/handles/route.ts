import { ZodError } from "zod";
import { getStorage, slugify, HandleInputSchema, type Handle } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, nowIso, serverError } from "@/lib/http";

export async function GET() {
  try {
    const handles = await getStorage().listHandles();
    return json({ handles });
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const input = HandleInputSchema.parse(body);
    const storage = getStorage();
    const id = input.id?.trim() || slugify(input.name);
    if (await storage.getHandle(id)) {
      return conflict(`handle already exists: ${id}`);
    }
    const now = nowIso();
    const handle: Handle = {
      id,
      name: input.name,
      notes: input.notes ?? "",
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveHandle(handle);
    return json({ handle }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
