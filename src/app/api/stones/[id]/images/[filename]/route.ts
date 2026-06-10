import { getStorage } from "@/lib/storage";
import { json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; filename: string }> };

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id, filename } = await params;
    const size = new URL(req.url).searchParams.get("size") === "thumb" ? "thumb" : "original";
    const blob = await getStorage().readStoneImage(id, filename, size);
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
    const stone = await storage.getStone(id);
    if (!stone) return notFound("stone not found");
    const idx = stone.images.findIndex((img) => img.filename === filename);
    if (idx === -1) return notFound("image not found");

    await storage.deleteStoneImage(id, filename);
    const updated = {
      ...stone,
      images: stone.images.filter((_, i) => i !== idx),
      updatedAt: nowIso(),
    };
    await storage.saveStone(updated);
    return json({ stone: updated });
  } catch (err) {
    return serverError(err);
  }
}
