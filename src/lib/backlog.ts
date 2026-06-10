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

export function nextBacklogPosition(knives: Knife[]): number {
  let max = 0;
  for (const k of knives) {
    if (typeof k.backlogPosition === "number" && k.backlogPosition > max) {
      max = k.backlogPosition;
    }
  }
  return max + 1;
}
