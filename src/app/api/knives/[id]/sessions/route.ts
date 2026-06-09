import { ZodError } from "zod";
import { getStorage, SharpeningSessionSchema } from "@/lib/storage";
import { badRequest, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return badRequest("body must be JSON");
    const session = SharpeningSessionSchema.parse(body);

    const storage = getStorage();
    const knife = await storage.getKnife(id);
    if (!knife) return notFound("knife not found");

    const updated = {
      ...knife,
      // Sharpening obviously falsifies "waiting to be sharpened" —
      // clear the backlog flag on first session. See docs/todos/backlog.md.
      backlog: false,
      sessions: [...knife.sessions, session].sort((a, b) => a.date.localeCompare(b.date)),
      updatedAt: nowIso(),
    };
    await storage.saveKnife(updated);
    return json({ knife: updated }, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) return fromZod(err);
    return serverError(err);
  }
}
