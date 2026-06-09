import type { Knife, Owner } from "./storage/types";

export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  knifeId: string;
  knifeName: string;
  ownerId: string;
  ownerName: string;
  angle: number;
  rating?: number;
  notes: string;
  coverFilename?: string;
}

export interface DiaryMonth {
  month: string; // YYYY-MM
  entries: DiaryEntry[];
}

export interface Diary {
  totalSessions: number;
  months: DiaryMonth[]; // newest first
  generatedAt: string;
}

export function computeDiary(
  knives: Knife[],
  owners: Owner[],
  now: Date = new Date(),
): Diary {
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  const entries: DiaryEntry[] = [];
  for (const k of knives) {
    const cover = k.images[0]?.filename;
    for (const s of k.sessions) {
      entries.push({
        date: s.date,
        knifeId: k.id,
        knifeName: k.name,
        ownerId: k.ownerId,
        ownerName: ownerById.get(k.ownerId)?.name ?? k.ownerId,
        angle: s.angle,
        rating: s.rating,
        notes: s.notes,
        coverFilename: cover,
      });
    }
  }

  // Newest first; stable secondary sort by knife name.
  entries.sort(
    (a, b) =>
      b.date.localeCompare(a.date) || a.knifeName.localeCompare(b.knifeName),
  );

  const byMonth = new Map<string, DiaryEntry[]>();
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = [];
      byMonth.set(key, bucket);
    }
    bucket.push(e);
  }

  const months: DiaryMonth[] = [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, entries]) => ({ month, entries }));

  return {
    totalSessions: entries.length,
    months,
    generatedAt: now.toISOString(),
  };
}
