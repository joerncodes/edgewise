import type { Abrasive, Knife } from "./storage/types";

export interface AbrasiveUsage {
  knifeId: string;
  knifeName: string;
  ownerId: string;
  date: string;
  angle: number;
  abrasives: string[]; // full progression for this session
}

export function usagesForAbrasive(knives: Knife[], abrasiveId: string): AbrasiveUsage[] {
  const out: AbrasiveUsage[] = [];
  for (const k of knives) {
    for (const s of k.sessions) {
      if (s.abrasives?.includes(abrasiveId)) {
        out.push({
          knifeId: k.id,
          knifeName: k.name,
          ownerId: k.ownerId,
          date: s.date,
          angle: s.angle,
          abrasives: s.abrasives ?? [],
        });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function sessionCountsByAbrasive(knives: Knife[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const k of knives) {
    for (const s of k.sessions) {
      if (!s.abrasives?.length) continue;
      for (const id of s.abrasives) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export interface AbrasiveListEntry {
  abrasive: Abrasive;
  count: number;
}

// Sort: most-used first, ties broken by grit ascending, then by name.
export function rankAbrasives(
  abrasives: Abrasive[],
  knives: Knife[],
): AbrasiveListEntry[] {
  const counts = sessionCountsByAbrasive(knives);
  return abrasives
    .map((a) => ({ abrasive: a, count: counts.get(a.id) ?? 0 }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.abrasive.grit - b.abrasive.grit ||
        a.abrasive.name.localeCompare(b.abrasive.name),
    );
}

// True if this abrasive represents a strop. Right now this is just a
// type-string check, but it's centralized here so the UI doesn't
// litter `type === "strop"` everywhere.
export function isStrop(abrasive: Abrasive): boolean {
  return abrasive.type.trim().toLowerCase() === "strop";
}
