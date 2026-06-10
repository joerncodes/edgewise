import { getStorage } from "@/lib/storage";
import { json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; filename: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id, filename } = await params;
    const size = new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "original";
    const blob = await getStorage().readAbrasiveImage(id, filename, size);
    if (!blob) return notFound("image not found");
    return new Response(new Uint8Array(blob.bytes), {
      status: 200,
      headers: {
        "Content-Type": blob.contentType,
        "Content-Length": String(blob.bytes.length),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id, filename } = await params;
    const storage = getStorage();
    const abrasive = await storage.getAbrasive(id);
    if (!abrasive) return notFound("abrasive not found");
    const idx = abrasive.images.findIndex((img) => img.filename === filename);
    if (idx === -1) return notFound("image not found");

    await storage.deleteAbrasiveImage(id, filename);
    const updated = {
      ...abrasive,
      images: abrasive.images.filter((_, i) => i !== idx),
      updatedAt: nowIso(),
    };
    await storage.saveAbrasive(updated);
    return json({ abrasive: updated });
  } catch (err) {
    return serverError(err);
  }
}
