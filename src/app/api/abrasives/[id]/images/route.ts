import {
  getStorage,
  sanitizeImageFilename,
  IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  type ImageMimeType,
} from "@/lib/storage";
import { badRequest, json, notFound, nowIso, serverError } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const storage = getStorage();
    const abrasive = await storage.getAbrasive(id);
    if (!abrasive) return notFound("abrasive not found");

    const form = await req.formData().catch(() => null);
    if (!form) return badRequest("expected multipart/form-data");

    const file = form.get("file");
    if (!(file instanceof File)) return badRequest("field 'file' is required");
    if (file.size === 0) return badRequest("file is empty");
    if (file.size > MAX_IMAGE_BYTES) {
      return badRequest(`file too large (max ${MAX_IMAGE_BYTES} bytes)`);
    }
    if (!(file.type in IMAGE_MIME_TYPES)) {
      return badRequest(
        `unsupported content-type ${file.type}; allowed: ${Object.keys(IMAGE_MIME_TYPES).join(", ")}`,
      );
    }
    const contentType = file.type as ImageMimeType;
    const caption = String(form.get("caption") ?? "");

    const ext = IMAGE_MIME_TYPES[contentType];
    let filename = sanitizeImageFilename(file.name || `image.${ext}`);
    if (!filename.toLowerCase().endsWith(`.${ext}`)) {
      filename = `${filename}.${ext}`;
    }
    let unique = filename;
    let n = 1;
    while (abrasive.images.some((img) => img.filename === unique)) {
      const dot = filename.lastIndexOf(".");
      unique =
        dot > 0
          ? `${filename.slice(0, dot)}-${n}${filename.slice(dot)}`
          : `${filename}-${n}`;
      n++;
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    await storage.saveAbrasiveImage(id, unique, contentType, bytes);

    const updated = {
      ...abrasive,
      images: [
        ...abrasive.images,
        { filename: unique, caption, addedAt: nowIso() },
      ],
      updatedAt: nowIso(),
    };
    await storage.saveAbrasive(updated);
    return json({ abrasive: updated }, { status: 201 });
  } catch (err) {
    return serverError(err);
  }
}
