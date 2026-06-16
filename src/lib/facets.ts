import type { Knife } from "./storage/types";

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  manufacturers: FacetValue[];
  steels: FacetValue[];
  handles: FacetValue[];
  types: FacetValue[];
  subtypes: FacetValue[];
  owners: FacetValue[];
}

// One categorical attribute on `Knife` that the UI lets users filter by.
// Ordered for default rendering — owner first, narrowing attributes
// after. `subtype` sits next to `type` so "Pocket Knife → folder"
// reads top-to-bottom in the sidebar.
export const FACET_KEYS = [
  "owner",
  "manufacturer",
  "type",
  "subtype",
  "steel",
  "handle",
] as const;
export type FacetKey = (typeof FACET_KEYS)[number];

export type FilterState = Record<FacetKey, Set<string>>;

export function emptyFilterState(): FilterState {
  return {
    owner: new Set(),
    manufacturer: new Set(),
    type: new Set(),
    subtype: new Set(),
    steel: new Set(),
    handle: new Set(),
  };
}

export function filterStateIsEmpty(s: FilterState): boolean {
  return FACET_KEYS.every((k) => s[k].size === 0);
}

export function totalActiveFilters(s: FilterState): number {
  return FACET_KEYS.reduce((acc, k) => acc + s[k].size, 0);
}

export function toggleFilter(
  s: FilterState,
  key: FacetKey,
  value: string,
): FilterState {
  const next = { ...s, [key]: new Set(s[key]) };
  if (next[key].has(value)) next[key].delete(value);
  else next[key].add(value);
  return next;
}

export function clearFacet(s: FilterState, key: FacetKey): FilterState {
  return { ...s, [key]: new Set() };
}

function fieldFor(key: FacetKey): (k: Knife) => string | undefined {
  switch (key) {
    case "owner":
      return (k) => k.ownerId;
    case "manufacturer":
      return (k) => k.manufacturer;
    case "type":
      return (k) => k.type;
    case "subtype":
      return (k) => k.subtype;
    case "steel":
      return (k) => k.steel;
    case "handle":
      return (k) => k.handle;
  }
}

// Distinct, non-empty values for one knife string field, with a count
// per value. Sorted by count desc, then value asc (stable across calls).
// Empty / whitespace-only fields are skipped — facets exist for picking
// something that *exists*, not for "no value set".
function tally(knives: Knife[], pick: (k: Knife) => string | undefined): FacetValue[] {
  const counts = new Map<string, number>();
  for (const k of knives) {
    const raw = pick(k);
    if (typeof raw !== "string") continue;
    const v = raw.trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

// Pure derivation of the categorical facets used by the homepage and
// /backlog filter sidebars. Future `/api/facets` endpoint can wrap
// this without re-implementing the rollup. See
// docs/todos/distinct-values-api.md.
export function computeFacets(knives: Knife[]): Facets {
  return {
    manufacturers: tally(knives, (k) => k.manufacturer),
    steels: tally(knives, (k) => k.steel),
    handles: tally(knives, (k) => k.handle),
    types: tally(knives, (k) => k.type),
    subtypes: tally(knives, (k) => k.subtype),
    owners: tally(knives, (k) => k.ownerId),
  };
}

// Apply all active facet filters (each facet is OR within, AND across)
// to `knives`. Pass `excludeKey` to skip one facet — that's how the
// sidebar computes "what would this facet's counts look like if I
// ticked one of its values" without making the facet self-exclude
// everything when fully ticked.
export function applyFilters(
  knives: Knife[],
  state: FilterState,
  excludeKey?: FacetKey,
): Knife[] {
  return knives.filter((k) => {
    for (const key of FACET_KEYS) {
      if (key === excludeKey) continue;
      const selected = state[key];
      if (selected.size === 0) continue;
      const value = fieldFor(key)(k);
      if (typeof value !== "string" || !value.trim()) return false;
      if (!selected.has(value.trim())) return false;
    }
    return true;
  });
}

// Options for one facet's checkbox list, in master order (the order the
// values had against the *unfiltered* dataset), with counts narrowed by
// every other active facet. Values that the master set never contained
// don't appear; values whose narrowed count is 0 do appear so the user
// can see "this would empty the result" instead of having the option
// vanish from under their cursor.
export function facetOptions(
  allKnives: Knife[],
  state: FilterState,
  key: FacetKey,
): FacetValue[] {
  const master = tally(allKnives, fieldFor(key));
  const narrowed = tally(applyFilters(allKnives, state, key), fieldFor(key));
  const narrowedCount = new Map(narrowed.map((v) => [v.value, v.count]));
  return master.map(({ value }) => ({
    value,
    count: narrowedCount.get(value) ?? 0,
  }));
}
