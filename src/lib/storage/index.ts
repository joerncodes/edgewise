import path from "node:path";
import { MarkdownStorage } from "./markdown";
import type { Storage } from "./types";

export * from "./types";
export { MarkdownStorage } from "./markdown";
export { slugify } from "./ids";

export function sanitizeImageFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const lastDot = base.lastIndexOf(".");
  const stem = lastDot > 0 ? base.slice(0, lastDot) : base;
  const ext = lastDot > 0 ? base.slice(lastDot + 1).toLowerCase() : "";
  const safeStem = stem
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "image";
  return ext ? `${safeStem}.${ext}` : safeStem;
}

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  cached = new MarkdownStorage({ dataDir });
  return cached;
}
