import { slugify } from "./storage/ids";
import type { Handle, Knife } from "./storage/types";

export interface HandleEntry {
  slug: string;
  displayName: string;
  count: number;
  knifeIds: string[];
  // True if a persisted Handle record exists for this slug. The list
  // and detail pages show the persisted notes when this is true;
  // otherwise the slug is purely derived from knife frontmatter.
  hasRecord: boolean;
}

// Group knives by `Knife.handle`, case-insensitive, then merge in any
// persisted Handle records so handles with notes but no knives yet
// still appear. Mirrors `groupSteels`.
export function groupHandles(knives: Knife[], handles: Handle[]): HandleEntry[] {
  const buckets = new Map<
    string,
    { spellings: Map<string, number>; knifeIds: string[] }
  >();

  for (const k of knives) {
    const raw = (k.handle ?? "").trim();
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

  const recordBySlug = new Map(handles.map((h) => [h.id, h]));

  const entries: HandleEntry[] = [];
  for (const [slug, b] of buckets) {
    const spellings = [...b.spellings.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
    const record = recordBySlug.get(slug);
    entries.push({
      slug,
      displayName: record?.name ?? spellings[0][0],
      count: b.knifeIds.length,
      knifeIds: b.knifeIds,
      hasRecord: Boolean(record),
    });
    recordBySlug.delete(slug);
  }

  // Handles with a record but no knife referencing them yet.
  for (const [slug, record] of recordBySlug) {
    entries.push({
      slug,
      displayName: record.name,
      count: 0,
      knifeIds: [],
      hasRecord: true,
    });
  }

  return entries;
}

export function findHandle(
  knives: Knife[],
  handles: Handle[],
  slug: string,
): HandleEntry | undefined {
  return groupHandles(knives, handles).find((h) => h.slug === slug);
}
