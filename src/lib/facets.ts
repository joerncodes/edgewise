import type { Knife } from "./storage/types";

export interface FacetValue {
  value: string;
  count: number;
}

export interface Facets {
  manufacturers: FacetValue[];
  steels: FacetValue[];
  types: FacetValue[];
  owners: FacetValue[];
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
// /backlog filter dropdowns. Future `/api/facets` endpoint can wrap
// this without re-implementing the rollup. See
// docs/todos/distinct-values-api.md and docs/todos/filter-dropdowns.md.
export function computeFacets(knives: Knife[]): Facets {
  return {
    manufacturers: tally(knives, (k) => k.manufacturer),
    steels: tally(knives, (k) => k.steel),
    types: tally(knives, (k) => k.type),
    owners: tally(knives, (k) => k.ownerId),
  };
}
