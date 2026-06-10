import type { Knife, Stone } from "./storage/types";

export interface StoneUsage {
  knifeId: string;
  knifeName: string;
  ownerId: string;
  date: string;
  angle: number;
  stones: string[]; // full progression for this session
}

export function usagesForStone(knives: Knife[], stoneId: string): StoneUsage[] {
  const out: StoneUsage[] = [];
  for (const k of knives) {
    for (const s of k.sessions) {
      if (s.stones?.includes(stoneId)) {
        out.push({
          knifeId: k.id,
          knifeName: k.name,
          ownerId: k.ownerId,
          date: s.date,
          angle: s.angle,
          stones: s.stones ?? [],
        });
      }
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function sessionCountsByStone(knives: Knife[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const k of knives) {
    for (const s of k.sessions) {
      if (!s.stones?.length) continue;
      for (const id of s.stones) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }
  return counts;
}

export interface StoneListEntry {
  stone: Stone;
  count: number;
}

// Sort: most-used first, ties broken by grit ascending, then by name.
export function rankStones(stones: Stone[], knives: Knife[]): StoneListEntry[] {
  const counts = sessionCountsByStone(knives);
  return stones
    .map((s) => ({ stone: s, count: counts.get(s.id) ?? 0 }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.stone.grit - b.stone.grit ||
        a.stone.name.localeCompare(b.stone.name),
    );
}
