import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import sharp from "sharp";
import YAML from "yaml";
import {
  KnifeSchema,
  OwnerSchema,
  SteelSchema,
  StoneSchema,
  mimeFromFilename,
  type ImageMimeType,
  type ImageSize,
  type Knife,
  type ImageBlob,
  type Owner,
  type Steel,
  type Stone,
  type Storage,
} from "./types";

// Thumbnails are always JPEG. Knife covers use a 3:1 banner; stones
// use a square. See docs/todos/thumbnails.md.
const THUMB_QUALITY = 80;
const THUMB_EXT = "jpg";
const THUMB_MIME: ImageMimeType = "image/jpeg";

const KNIFE_THUMB = { width: 600, height: 200 };
const STONE_THUMB = { width: 400, height: 400 };

export function thumbFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  return `${stem}.thumb.${THUMB_EXT}`;
}

export function isThumbFilename(filename: string): boolean {
  return filename.toLowerCase().endsWith(`.thumb.${THUMB_EXT}`);
}

export async function makeThumbnail(
  bytes: Buffer,
  size: { width: number; height: number } = KNIFE_THUMB,
): Promise<Buffer> {
  return sharp(bytes)
    .rotate() // honour EXIF orientation
    .resize(size.width, size.height, { fit: "cover", position: "centre" })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toBuffer();
}

function normalizeDates<T>(value: T): T {
  if (value instanceof Date) {
    const iso = value.toISOString();
    return (/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/.test(iso)
      ? iso.slice(0, 10)
      : iso) as unknown as T;
  }
  if (Array.isArray(value)) return value.map(normalizeDates) as unknown as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalizeDates(v)]),
    ) as T;
  }
  return value;
}

export interface MarkdownStorageOptions {
  dataDir: string;
}

export class MarkdownStorage implements Storage {
  private dataDir: string;
  private knivesDir: string;
  private ownersDir: string;
  private steelsDir: string;
  private stonesDir: string;
  private imagesDir: string;
  private stoneImagesDir: string;

  constructor(opts: MarkdownStorageOptions) {
    this.dataDir = opts.dataDir;
    this.knivesDir = path.join(this.dataDir, "knives");
    this.ownersDir = path.join(this.dataDir, "owners");
    this.steelsDir = path.join(this.dataDir, "steels");
    this.stonesDir = path.join(this.dataDir, "stones");
    this.imagesDir = path.join(this.dataDir, "images");
    this.stoneImagesDir = path.join(this.dataDir, "stone-images");
  }

  private async ensureDirs() {
    await fs.mkdir(this.knivesDir, { recursive: true });
    await fs.mkdir(this.ownersDir, { recursive: true });
    await fs.mkdir(this.steelsDir, { recursive: true });
    await fs.mkdir(this.stonesDir, { recursive: true });
    await fs.mkdir(this.imagesDir, { recursive: true });
    await fs.mkdir(this.stoneImagesDir, { recursive: true });
  }

  private knifePath(id: string) {
    return path.join(this.knivesDir, `${id}.md`);
  }

  private ownerPath(id: string) {
    return path.join(this.ownersDir, `${id}.md`);
  }

  private steelPath(id: string) {
    return path.join(this.steelsDir, `${id}.md`);
  }

  private stonePath(id: string) {
    return path.join(this.stonesDir, `${id}.md`);
  }

  private knifeImagesDir(id: string) {
    return path.join(this.imagesDir, id);
  }

  private knifeImagePath(id: string, filename: string) {
    const safe = path.basename(filename);
    if (safe !== filename || safe.includes("..") || safe.startsWith(".")) {
      throw new Error(`invalid image filename: ${filename}`);
    }
    return path.join(this.knifeImagesDir(id), safe);
  }

  private stoneImagesDirFor(id: string) {
    return path.join(this.stoneImagesDir, id);
  }

  private stoneImagePath(id: string, filename: string) {
    const safe = path.basename(filename);
    if (safe !== filename || safe.includes("..") || safe.startsWith(".")) {
      throw new Error(`invalid image filename: ${filename}`);
    }
    return path.join(this.stoneImagesDirFor(id), safe);
  }

  private async readFileOrNull(p: string): Promise<string | null> {
    try {
      return await fs.readFile(p, "utf8");
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  private parseKnife(raw: string): Knife {
    const parsed = matter(raw);
    const data = normalizeDates({
      ...parsed.data,
      notes: parsed.content.trim(),
    });
    return KnifeSchema.parse(data);
  }

  private serializeKnife(knife: Knife): string {
    const { notes, ...rest } = knife;
    const fm = YAML.stringify(rest);
    return `---\n${fm}---\n\n${notes ?? ""}\n`;
  }

  private parseOwner(raw: string): Owner {
    const parsed = matter(raw);
    const data = normalizeDates({
      ...parsed.data,
      notes: parsed.content.trim(),
    });
    return OwnerSchema.parse(data);
  }

  private serializeOwner(owner: Owner): string {
    const { notes, ...rest } = owner;
    const fm = YAML.stringify(rest);
    return `---\n${fm}---\n\n${notes ?? ""}\n`;
  }

  async listKnives(): Promise<Knife[]> {
    await this.ensureDirs();
    const entries = await fs.readdir(this.knivesDir);
    const knives = await Promise.all(
      entries
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(this.knivesDir, f), "utf8");
          return this.parseKnife(raw);
        }),
    );
    return knives.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getKnife(id: string): Promise<Knife | null> {
    await this.ensureDirs();
    const raw = await this.readFileOrNull(this.knifePath(id));
    return raw ? this.parseKnife(raw) : null;
  }

  async saveKnife(knife: Knife): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(this.knifePath(knife.id), this.serializeKnife(knife), "utf8");
  }

  async deleteKnife(id: string): Promise<boolean> {
    let removedMd = false;
    try {
      await fs.unlink(this.knifePath(id));
      removedMd = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    await fs.rm(this.knifeImagesDir(id), { recursive: true, force: true });
    return removedMd;
  }

  async saveKnifeImage(
    knifeId: string,
    filename: string,
    _contentType: ImageMimeType,
    bytes: Buffer,
  ): Promise<void> {
    const target = this.knifeImagePath(knifeId, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);

    // Derivative for card-grid use; failures are non-fatal — the read
    // path falls back to the original if the thumb is missing.
    try {
      const thumbBytes = await makeThumbnail(bytes);
      const thumbPath = this.knifeImagePath(knifeId, thumbFilename(filename));
      await fs.writeFile(thumbPath, thumbBytes);
    } catch (err) {
      console.warn(
        `thumb generation failed for ${knifeId}/${filename}:`,
        (err as Error).message,
      );
    }
  }

  async readKnifeImage(
    knifeId: string,
    filename: string,
    size: ImageSize = "original",
  ): Promise<ImageBlob | null> {
    const mime = mimeFromFilename(filename);
    if (!mime) return null;

    if (size === "thumb") {
      const thumbPath = this.knifeImagePath(knifeId, thumbFilename(filename));
      try {
        const cached = await fs.readFile(thumbPath);
        return { bytes: cached, contentType: THUMB_MIME };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
      // Cache miss: generate from the original and write it through.
      // See ADR-0011.
      const originalPath = this.knifeImagePath(knifeId, filename);
      let originalBytes: Buffer;
      try {
        originalBytes = await fs.readFile(originalPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
      try {
        const generated = await makeThumbnail(originalBytes);
        await fs.writeFile(thumbPath, generated);
        return { bytes: generated, contentType: THUMB_MIME };
      } catch (err) {
        console.warn(
          `thumb generation failed for ${knifeId}/${filename}; serving original:`,
          (err as Error).message,
        );
        return { bytes: originalBytes, contentType: mime };
      }
    }

    try {
      const bytes = await fs.readFile(this.knifeImagePath(knifeId, filename));
      return { bytes, contentType: mime };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async deleteKnifeImage(knifeId: string, filename: string): Promise<boolean> {
    let removed = false;
    try {
      await fs.unlink(this.knifeImagePath(knifeId, filename));
      removed = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    try {
      await fs.unlink(this.knifeImagePath(knifeId, thumbFilename(filename)));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return removed;
  }

  async listOwners(): Promise<Owner[]> {
    await this.ensureDirs();
    const entries = await fs.readdir(this.ownersDir);
    const owners = await Promise.all(
      entries
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(this.ownersDir, f), "utf8");
          return this.parseOwner(raw);
        }),
    );
    return owners.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getOwner(id: string): Promise<Owner | null> {
    await this.ensureDirs();
    const raw = await this.readFileOrNull(this.ownerPath(id));
    return raw ? this.parseOwner(raw) : null;
  }

  async saveOwner(owner: Owner): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(this.ownerPath(owner.id), this.serializeOwner(owner), "utf8");
  }

  async deleteOwner(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.ownerPath(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  private parseSteel(raw: string): Steel {
    const parsed = matter(raw);
    const data = normalizeDates({
      ...parsed.data,
      notes: parsed.content.trim(),
    });
    return SteelSchema.parse(data);
  }

  private serializeSteel(steel: Steel): string {
    const { notes, ...rest } = steel;
    const fm = YAML.stringify(rest);
    return `---\n${fm}---\n\n${notes ?? ""}\n`;
  }

  async listSteels(): Promise<Steel[]> {
    await this.ensureDirs();
    const entries = await fs.readdir(this.steelsDir);
    const steels = await Promise.all(
      entries
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(this.steelsDir, f), "utf8");
          return this.parseSteel(raw);
        }),
    );
    return steels.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getSteel(id: string): Promise<Steel | null> {
    await this.ensureDirs();
    const raw = await this.readFileOrNull(this.steelPath(id));
    return raw ? this.parseSteel(raw) : null;
  }

  async saveSteel(steel: Steel): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(this.steelPath(steel.id), this.serializeSteel(steel), "utf8");
  }

  async deleteSteel(id: string): Promise<boolean> {
    try {
      await fs.unlink(this.steelPath(id));
      return true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return false;
      throw err;
    }
  }

  private parseStone(raw: string): Stone {
    const parsed = matter(raw);
    const data = normalizeDates({
      ...parsed.data,
      notes: parsed.content.trim(),
    });
    return StoneSchema.parse(data);
  }

  private serializeStone(stone: Stone): string {
    const { notes, ...rest } = stone;
    const fm = YAML.stringify(rest);
    return `---\n${fm}---\n\n${notes ?? ""}\n`;
  }

  async listStones(): Promise<Stone[]> {
    await this.ensureDirs();
    const entries = await fs.readdir(this.stonesDir);
    const stones = await Promise.all(
      entries
        .filter((f) => f.endsWith(".md"))
        .map(async (f) => {
          const raw = await fs.readFile(path.join(this.stonesDir, f), "utf8");
          return this.parseStone(raw);
        }),
    );
    // Sort coarse → fine; ties broken by name.
    return stones.sort(
      (a, b) => a.grit - b.grit || a.name.localeCompare(b.name),
    );
  }

  async getStone(id: string): Promise<Stone | null> {
    await this.ensureDirs();
    const raw = await this.readFileOrNull(this.stonePath(id));
    return raw ? this.parseStone(raw) : null;
  }

  async saveStone(stone: Stone): Promise<void> {
    await this.ensureDirs();
    await fs.writeFile(this.stonePath(stone.id), this.serializeStone(stone), "utf8");
  }

  async deleteStone(id: string): Promise<boolean> {
    let removedMd = false;
    try {
      await fs.unlink(this.stonePath(id));
      removedMd = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    await fs.rm(this.stoneImagesDirFor(id), { recursive: true, force: true });
    return removedMd;
  }

  async saveStoneImage(
    stoneId: string,
    filename: string,
    _contentType: ImageMimeType,
    bytes: Buffer,
  ): Promise<void> {
    const target = this.stoneImagePath(stoneId, filename);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);

    try {
      const thumbBytes = await makeThumbnail(bytes, STONE_THUMB);
      const thumbPath = this.stoneImagePath(stoneId, thumbFilename(filename));
      await fs.writeFile(thumbPath, thumbBytes);
    } catch (err) {
      console.warn(
        `thumb generation failed for stone ${stoneId}/${filename}:`,
        (err as Error).message,
      );
    }
  }

  async readStoneImage(
    stoneId: string,
    filename: string,
    size: ImageSize = "original",
  ): Promise<ImageBlob | null> {
    const mime = mimeFromFilename(filename);
    if (!mime) return null;

    if (size === "thumb") {
      const thumbPath = this.stoneImagePath(stoneId, thumbFilename(filename));
      try {
        const cached = await fs.readFile(thumbPath);
        return { bytes: cached, contentType: THUMB_MIME };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
      }
      // Cache miss: regenerate from the original. Mirrors the knife
      // read-path (ADR-0011) — GETs may write the cache.
      const originalPath = this.stoneImagePath(stoneId, filename);
      let originalBytes: Buffer;
      try {
        originalBytes = await fs.readFile(originalPath);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
      try {
        const generated = await makeThumbnail(originalBytes, STONE_THUMB);
        await fs.writeFile(thumbPath, generated);
        return { bytes: generated, contentType: THUMB_MIME };
      } catch (err) {
        console.warn(
          `thumb generation failed for stone ${stoneId}/${filename}; serving original:`,
          (err as Error).message,
        );
        return { bytes: originalBytes, contentType: mime };
      }
    }

    try {
      const bytes = await fs.readFile(this.stoneImagePath(stoneId, filename));
      return { bytes, contentType: mime };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async deleteStoneImage(stoneId: string, filename: string): Promise<boolean> {
    let removed = false;
    try {
      await fs.unlink(this.stoneImagePath(stoneId, filename));
      removed = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    try {
      await fs.unlink(this.stoneImagePath(stoneId, thumbFilename(filename)));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
    return removed;
  }
}
