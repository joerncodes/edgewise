import { ZodError } from "zod";
import { getStorage, SharpeningSessionSchema } from "@/lib/storage";
import { badRequest, conflict, fromZod, json, notFound, nowIso, serverError } from "@/lib/http";

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

    // Date is the primary key for PATCH/DELETE on individual sessions
    // (see /api/knives/[id]/sessions/[date]). Keep it unique per knife.
    if (knife.sessions.some((s) => s.date === session.date)) {
      return conflict(`session already exists on ${session.date}`);
    }

    if (session.abrasives?.length) {
      const missing: string[] = [];
      for (const abrasiveId of session.abrasives) {
        if (!(await storage.getAbrasive(abrasiveId))) missing.push(abrasiveId);
      }
      if (missing.length > 0) {
        return badRequest(`abrasive(s) not found: ${missing.join(", ")}`);
      }
    }

    const updated = {
      ...knife,
      // Sharpening obviously falsifies "waiting to be sharpened" —
      // clear the backlog flag (and its queue position) on first session.
      // See docs/todos/backlog.md and docs/todos/backlog-manual-order.md.
      backlog: false,
      backlogPosition: undefined,
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
