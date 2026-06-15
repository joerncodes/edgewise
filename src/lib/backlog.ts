import type { Knife } from "./storage/types";

export function inBacklog(k: Knife): boolean {
  return k.backlog === true;
}

export function backlogList(knives: Knife[]): Knife[] {
  return knives.filter(inBacklog);
}

// Manual queue order. Knives with a `backlogPosition` come first in
// ascending order; any backlog knife missing a position is auto-appended,
// ordered by `createdAt` so newly-flagged knives slot in deterministically.
// See docs/todos/backlog-manual-order.md.
export function sortByPosition(knives: Knife[]): Knife[] {
  const positioned: Knife[] = [];
  const unpositioned: Knife[] = [];
  for (const k of knives) {
    if (typeof k.backlogPosition === "number") positioned.push(k);
    else unpositioned.push(k);
  }
  positioned.sort((a, b) => (a.backlogPosition ?? 0) - (b.backlogPosition ?? 0));
  unpositioned.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...positioned, ...unpositioned];
}

export type BacklogAge = "fresh" | "warm" | "stale";

// Whole days from `createdAt` to `now`. Negative values clamp to 0 — a
// knife with a future-dated `createdAt` (clock skew between machines)
// shouldn't render as "older than time itself."
export function backlogAgeDays(k: Knife, now: Date): number {
  const then = new Date(k.createdAt);
  if (Number.isNaN(then.getTime())) return 0;
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  return Math.max(0, days);
}

// Anchored to `createdAt` because there's no separate `backloggedAt`
// field — see docs/todos/backlog-age-coloring.md for why we accept the
// small misreport on knives that were flagged into backlog long after
// being created.
export function backlogAgeBucket(k: Knife, now: Date): BacklogAge {
  const days = backlogAgeDays(k, now);
  if (days < 7) return "fresh";
  if (days < 28) return "warm";
  return "stale";
}

export function nextBacklogPosition(knives: Knife[]): number {
  let max = 0;
  for (const k of knives) {
    if (typeof k.backlogPosition === "number" && k.backlogPosition > max) {
      max = k.backlogPosition;
    }
  }
  return max + 1;
}
