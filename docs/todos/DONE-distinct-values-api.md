---
filetype: todo
status: done
---

# `GET /api/facets` — distinct values for list-able knife attributes

Right now, every page that wants to render a "filter by X" dropdown
(`/`, `/backlog`, eventually `/handles`) has to fetch the entire
knife list and derive the distinct set client-side. That works, but:

- Each consumer reimplements the same `new Set(knives.map(k =>
  k.steel))` boilerplate.
- External clients (Claude, scripts, future mobile) end up shipping
  the same logic.
- It's wasteful — to populate a "steel" dropdown you currently pull
  every knife with all its sessions and images metadata.

A single endpoint that returns the distinct, non-empty values for
every list-able attribute fixes all three.

## What we want

- `GET /api/facets` → returns one object whose keys are the
  attributes and whose values are sorted, de-duplicated, non-empty
  strings (plus a count per value).

  ```json
  {
    "manufacturers": [{"value": "Spyderco", "count": 3}, ...],
    "steels":        [{"value": "S90V",     "count": 1}, ...],
    "types":         [{"value": "Pocket Knife", "count": 4}, ...],
    "handles":       [{"value": "G10",      "count": 2}, ...],
    "owners":        [{"value": "joern-meyer", "count": 6}, ...]
  }
  ```

- Owner values are owner IDs (the foreign key), not display names.
  Consumers can hit `/api/owners` if they need the human name —
  same pattern the homepage already follows.
- Sort: by `count` desc, then `value` asc. Stable across calls.
- Empty strings and missing fields are excluded — facets are for
  picking *something that exists*, not for "no value set".

## Open questions

- **Name: `/api/facets` or `/api/distinct` or `/api/values`?**
  Lean `facets` — it's the established term for "distinct values
  used to filter a result set", and leaves room to grow (range
  facets for `sessions.length`, date facets for `lastSharpenedAt`,
  etc.). `distinct` is fine but narrower.
- **Counts: include or not?** Include. Cheap to compute alongside
  the distinct set, and useful for sorting and for "this filter
  has 12 matches" hints in the UI. If a consumer doesn't want
  them, they ignore the field.
- **Which attributes?** Start with the schema-bound ones:
  `manufacturers`, `steels`, `types`, `owners`. Add `handles`
  once that field lands ([[handle-material]]). Don't include
  free-form `notes` or `name` — facets are for categorical fields,
  not text.
- **Caching.** Endpoint is read-only and derived. The data changes
  whenever a knife is created/updated/deleted. For v1 just
  recompute on every request — the underlying list is already
  in-memory after `getStorage().listKnives()`. Add caching only
  if it shows up in a profile.
- **Should this also live as a derived helper?** Yes — put the
  pure function in `src/lib/facets.ts` so the future janitor
  ("steels with one knife"-style lenses) can reuse it without
  going through HTTP.

## Notes for whoever picks this up

- New route: `src/app/api/facets/route.ts`. Follow the shape of
  `src/app/api/stats/route.ts` — fetch the knife list, call a pure
  helper, return JSON.
- New helper: `src/lib/facets.ts` exporting `computeFacets(knives:
  Knife[]): Facets`. Type the return so the api-client can pick it
  up.
- Extend `src/lib/api-client.ts` with `getFacets:` next to
  `getStats` / `getDiary` / `getJanitor`. Reuse the existing
  `request<T>()` wrapper.
- Replace the ad-hoc derivation in `src/app/page.tsx`,
  `src/app/backlog/page.tsx`, and anywhere else that does
  `new Set(knives.map(...))` once the endpoint exists. Not
  required up front — the endpoint stands on its own — but it's
  the obvious follow-up.
- Document on `docs/api.md` and let the Zod-driven `/api/docs`
  endpoint (ADR-0009) pick it up.
- ADR-0006 still applies — pure read endpoint, no writes.
- Related: [[handle-material]] (adds another facet),
  [[manufacturers]] / [[steels]] (the existing "list of distinct
  X" pages this generalizes).
