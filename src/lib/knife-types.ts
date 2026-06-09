import { slugify } from "./storage/ids";
import type { Knife } from "./storage/types";

export interface KnifeTypeEntry {
  slug: string;
  displayName: string;
  count: number;
  knifeIds: string[];
}

// Group knives by `type` field with case-insensitive matching. The display
// name is whichever spelling appears most often; ties resolved by alphabetical
// order so the result is deterministic. Mirrors `groupManufacturers`.
export function groupKnifeTypes(knives: Knife[]): KnifeTypeEntry[] {
  const buckets = new Map<
    string,
    { spellings: Map<string, number>; knifeIds: string[] }
  >();

  for (const k of knives) {
    const raw = (k.type ?? "").trim();
    if (!raw) continue;
    const slug = slugify(raw);
    if (!slug) continue;
    let b = buckets.get(slug);
    if (!b) {
      b = { spellings: new Map(), knifeIds: [] };
      buckets.set(slug, b);
    }
    b.spellings.set(raw, (b.spellings.get(raw) ?? 0) + 1);
    b.knifeIds.push(k.id);
  }

  const entries: KnifeTypeEntry[] = [];
  for (const [slug, b] of buckets) {
    const spellings = [...b.spellings.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    entries.push({
      slug,
      displayName: spellings[0][0],
      count: b.knifeIds.length,
      knifeIds: b.knifeIds,
    });
  }
  return entries;
}

export function findKnifeType(
  knives: Knife[],
  slug: string,
): KnifeTypeEntry | undefined {
  return groupKnifeTypes(knives).find((t) => t.slug === slug);
}
