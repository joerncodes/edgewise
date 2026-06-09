import { getStorage } from "@/lib/storage";
import { json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; filename: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id, filename } = await params;
    const size = new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "original";
    const blob = await getStorage().readKnifeImage(id, filename, size);
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
    const knife = await storage.getKnife(id);
    if (!knife) return notFound("knife not found");
    const idx = knife.images.findIndex((img) => img.filename === filename);
    if (idx === -1) return notFound("image not found");

    await storage.deleteKnifeImage(id, filename);
    const updated = {
      ...knife,
      images: knife.images.filter((_, i) => i !== idx),
      updatedAt: nowIso(),
    };
    await storage.saveKnife(updated);
    return json({ knife: updated });
  } catch (err) {
    return serverError(err);
  }
}
