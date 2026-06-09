import path from "node:path";
import { MarkdownStorage } from "./markdown";
import type { Storage } from "./types";

export * from "./types";
export { MarkdownStorage } from "./markdown";
export { slugify } from "./ids";

let cached: Storage | null = null;

export function getStorage(): Storage {
  if (cached) return cached;
  const dataDir = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
  cached = new MarkdownStorage({ dataDir });
  return cached;
}
