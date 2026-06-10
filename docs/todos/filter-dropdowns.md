---
filetype: todo
status: done
completedOn: 2026-06-10
---

# Manufacturer, steel, and handle filter dropdowns on `/` and `/backlog`

> **Mostly done.** Implemented 2026-06-10. `/` and `/backlog` now carry
> Manufacturer (`Factory`) and Steel (`Atom`) dropdowns next to the
> owner one, with "All …" reset entries and per-value counts on the
> options. Filters AND together. The dropdowns auto-hide when their
> facet is empty so the toolbar stays tidy on a fresh install. The
> facet values are derived client-side via `computeFacets()` in
> `src/lib/facets.ts` — a pure helper sized to also back the future
> `/api/facets` endpoint ([[distinct-values-api]]). On `/backlog` the
> facets are derived from the backlog slice only, matching the
> existing "owners with backlog" pattern; activating any filter
> pauses drag-and-drop (consistent with the search/owner behaviour
> shipped in [[backlog-manual-order]]).
>
> **Handle dropdown is deferred** until [[handle-material]] lands —
> there's no `handle` field on `Knife` yet, so the dropdown would
> have nothing to render. Once that ships, copy the manufacturer
> block, swap the icon, and point at `facets.handles`.

Today the homepage has one filter dropdown (owner) plus the
free-text search. The search box already matches substring across
`name`, `owner`, `type`, and `steel`, but you can't *narrow* by a
specific manufacturer or steel without typing it out and hoping the
substring is unique.

Add proper categorical dropdowns next to the owner one for the
attributes that have a small, stable cardinality: manufacturer,
steel, and (once it exists) handle.

## What we want

- Three new `Select` components next to the existing owner filter
  on `src/app/page.tsx` and `src/app/backlog/page.tsx`:
  - **Manufacturer** — values from
    `[[distinct-values-api]]`'s `manufacturers` facet. Icon:
    `Factory` (already used on the detail page).
  - **Steel** — values from the `steels` facet. Icon: `Atom`.
  - **Handle** — values from the `handles` facet. Icon: `Grip`
    or whichever lucide icon the [[handle-material]] todo picks.
- Each dropdown has an "All …" option at the top that clears the
  filter. Same UX as the owner one.
- Filters AND together — picking a manufacturer *and* a steel
  shows only knives that match both. The existing `q`/`needle`
  search still ANDs on top.
- Counts in the option labels: "S90V (1)". Cheap once the facets
  endpoint is live and helpful when you're scanning for "which
  steels do I even have".
- Empty/missing values are excluded from the dropdown (per the
  facets endpoint's contract).

## Open questions

- **Where do the facet values come from?** Prefer the
  `[[distinct-values-api]]` endpoint once it lands — one request,
  shared shape, no duplication. Until then, derive them
  client-side from the knife list (same pattern as the owner
  dropdown today). Don't block this todo on the API one — start
  with the derivation, swap the data source later.
- **Mobile / overflow.** Four dropdowns + search + sort is a lot
  on a narrow viewport. `flex flex-wrap` already wraps gracefully;
  test once it's wired up. If it gets ugly, collapse the
  categorical filters into a single popover ("Filters" button
  with all dropdowns inside).
- **Persist filter state in the URL?** Lean **no** for v1 — it's a
  single-user app and the current page doesn't persist sort/owner
  either. Revisit if the owner asks (sharable filtered links).
- **Should `/backlog` have all three?** Yes — same shape, same
  benefit. Extract a `<KnifeFilters>` component into
  `src/components/` if duplication gets annoying. Both pages
  already share `KnifeCard`.

## Notes for whoever picks this up

- Existing owner dropdown at `src/app/page.tsx` ~line 158 is the
  template — copy its shape (`Select` / `SelectTrigger` /
  `SelectValue` with the icon render-prop / `SelectContent` with
  `SelectItem`s).
- New state hooks alongside `ownerFilter`:
  `manufacturerFilter`, `steelFilter`, `handleFilter`. Default
  `"all"`.
- Extend the `filteredSorted` `useMemo` filter chain. Each
  dropdown adds one `if (filter !== "all" && k.field !== filter)
  return false;` line.
- Update the search-box placeholder to reflect the new filterable
  fields (or simplify it — the dropdowns make the placeholder less
  load-bearing).
- Depends on (but doesn't block on):
  - [[handle-material]] — the `handle` field has to exist before
    the handle dropdown can render anything.
  - [[distinct-values-api]] — nicer data source, optional.
- ADR-0006 still applies — read-only UI here.
