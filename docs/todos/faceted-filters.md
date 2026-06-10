---
filetype: todo
status: done
completedOn: 2026-06-10
---

# Faceted filters in a left sidebar

> **Done.** Implemented 2026-06-10. `/` and `/backlog` now carry a
> sticky left sidebar (`lg:grid-cols-[240px_1fr]`) with one accordion
> section per facet (Owner, Manufacturer, Type, Steel) — checkboxes,
> within-facet OR, across-facet AND, and counts that narrow live as
> selections tighten via the new `facetOptions()` / `applyFilters()`
> helpers in `src/lib/facets.ts`. Zero-count values stay visible but
> render disabled + 50% opacity so they don't vanish from under the
> cursor. Sidebar shows "Clear all" up top when anything is active,
> plus a per-facet "Clear" inside each accordion header. On mobile
> the sidebar collapses; the toolbar grows a "Filters (N)" button
> that opens a right-side `Sheet` containing the same component.
> Card grids step to three columns at `xl` instead of `lg` to give
> the sidebar room. Old Manufacturer / Steel `Select`s on the
> toolbar are gone. Drag-and-drop on `/backlog` still pauses when
> any filter is active (works with the new `filterStateIsEmpty`
> gate).
>
> The shared sidebar/sheet UI lives in
> `src/components/knife-filters.tsx`; both pages pass the same
> `(knives, ownerById, state, onChange)` props. URL state and a
> per-facet search input were deferred per the leans below.
>
> **Handle facet stays deferred** until [[handle-material]] lands.
> When it ships, add `"handle"` to `FACET_KEYS` + a getter in
> `fieldFor()` in `src/lib/facets.ts`, and an entry to the `FACETS`
> array in `src/components/knife-filters.tsx`. Empty facets
> auto-hide, so the accordion only appears once a knife actually
> carries a value.

The Manufacturer / Steel dropdowns shipped in [[filter-dropdowns]]
work, but they're single-select and the values are hidden behind a
trigger. Once Handle and Type land, a row of four dropdowns is a lot
of clicking for "show me the chef knives in carbon steel that Guido
brought".

Move to a faceted-search sidebar — the pattern every e-commerce site
uses, because it's the right one for "I want to browse, narrowing as
I go". All values visible, checkboxes for multi-select, counts that
update as filters tighten.

See [[filter-dropdowns]] for what's there today, and
[[distinct-values-api]] for the data source.

## What we want

- **Left-column sidebar** on `/` and `/backlog` (desktop) with one
  accordion section per facet. Default open: Owner. Others
  collapsed.
- **Checkboxes**, not radio buttons. Within a facet, ticking two
  values means OR. Across facets, AND. ("Owner = Guido OR Jan, AND
  Manufacturer = Spyderco".)
- **Counts that narrow with the rest of the filters.** Once you
  pick an owner, the manufacturer list re-rolls so each maker's
  count reflects only that owner's knives. Implementation: call
  `computeFacets(filtered)` instead of `computeFacets(knives)`,
  where `filtered` applies all *other* facet filters but not this
  one (each facet is computed against "everything except itself").
- **Zero-count handling.** Values that would drop to zero under the
  current selection still render but greyed out and disabled — so
  the user can see "oh, no Spyderco knives in carbon steel" rather
  than the option silently disappearing. Exception: facet values
  with zero against the *unfiltered* dataset never appear at all
  (same as today).
- **"Clear all" affordance** at the top of the sidebar when any
  filter is active. Per-facet "Clear" inside each accordion header.
- **Mobile**: a "Filters" button in the toolbar opens a Sheet from
  the right (or bottom — open question) containing the same
  accordions. Same content, different chrome.
- **Drop the existing Manufacturer / Steel dropdowns** from the
  toolbar — the sidebar replaces them. Keep the Sort dropdown and
  the Search input.
- **Owner moves into the sidebar too** for consistency. It's a
  facet like the others.

## Open questions

- **URL state.** Lean **defer** — same reasoning as
  [[filter-dropdowns]]: single user, current sort/owner aren't
  persisted either. Revisit when shareable filtered links matter.
  When we do it, query-string shape: `?owner=guido,jan&steel=S90V`
  is the obvious one.
- **Mobile sheet side.** Right-side sheet is the iOS/Android norm
  for "filters" buttons. Bottom sheet feels more native but takes
  more vertical room and is awkward for accordions. Lean **right**.
- **Sidebar width on desktop.** ~220–260px is the sweet spot. The
  card grid drops from 3 to 2 columns at narrow widths anyway, so
  carving off this much from `lg:grid-cols-3` will only really
  affect very-wide displays. Acceptable trade.
- **Facet order.** Lean: Owner → Manufacturer → Type → Steel →
  Handle. Owner first because it's the strongest "who is this for"
  bucket; Handle last because cardinality is small.
- **Search inside a facet.** When a facet has 30+ values (eventual
  Steel, maybe), a small search input at the top of the accordion
  helps. Skip for v1 — defer until any single facet actually has
  20+ values.
- **Backlog-page facets: full list or backlog-only?** Today the
  backlog dropdowns derive from the backlog slice (see
  [[filter-dropdowns]]). Keep that: the sidebar on `/backlog`
  computes facets from `backlog` knives, not all knives. Same
  reasoning — a steel that only shows up on sharpened knives
  shouldn't be in the dropdown.
- **Should the sidebar be sticky on scroll?** Lean **yes** with
  `sticky top-0 self-start`. The card grid is long; losing the
  filters off-screen is annoying.
- **Drag-and-drop interaction.** Filtering already disables drag on
  `/backlog` (see [[backlog-manual-order]]). That stays. The
  sidebar just becomes the new way to activate filters.

## UI sketch

```
┌─────────────────────────────────────────────────────────────┐
│ Edgewise · 42 knives                                        │
├──────────────┬──────────────────────────────────────────────┤
│ FILTERS      │ [ search… ]      [ Sort: most recent ▾ ]     │
│ Clear all    │                                              │
│              │ ┌────────┐ ┌────────┐ ┌────────┐             │
│ ▾ Owner      │ │ knife  │ │ knife  │ │ knife  │             │
│   ☑ Guido (12)│ │ card   │ │ card   │ │ card   │             │
│   ☐ Jan (8)   │ └────────┘ └────────┘ └────────┘             │
│   ☐ Manuel (4)│ ┌────────┐ ┌────────┐ ┌────────┐             │
│ ▸ Manufacturer│ │ knife  │ │ knife  │ │ knife  │             │
│ ▸ Type        │ │ card   │ │ card   │ │ card   │             │
│ ▸ Steel       │ └────────┘ └────────┘ └────────┘             │
│ ▸ Handle      │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

Mobile: collapse the left column, surface a `[ Filters · 2 ]`
button next to Search; opens a right-side sheet with the same
accordions inside.

## Notes for whoever picks this up

- New shadcn components needed: `sheet`, `checkbox`. Install with
  `pnpm dlx shadcn@latest add sheet checkbox`. `accordion` is
  already in `src/components/ui/`.
- State shape: `Record<FacetKey, Set<string>>`. `FacetKey =
  "owner" | "manufacturer" | "steel" | "type" | "handle"`. An
  empty set means "no filter" for that facet (equivalent to today's
  `"all"`).
- New helper: extend `src/lib/facets.ts` with `computeFacetsExcluding(
  knives, activeFilters, excludeKey)` — applies every active facet
  *except* `excludeKey` and returns the rolled-up counts. Each
  facet's UI calls it with its own key as `excludeKey`, so the
  counts reflect "what would happen if I ticked this".
- Zero-count values: compute against the unfiltered dataset to get
  the master list, then enrich with the narrowed counts. Render
  zero-count entries with `disabled` + `opacity-50`.
- Extract `<KnifeFilters>` into `src/components/` this time —
  duplicating four facets twice is too much for inline. Same
  component renders inside the desktop sidebar and the mobile
  Sheet; the parent passes in the knife list, the current filter
  state, and the setters.
- Drop the existing Manufacturer / Steel `Select`s from
  `src/app/page.tsx` and `src/app/backlog/page.tsx` when wiring
  this up. Keep Sort and Search where they are.
- Active-filter chip row above the grid? Optional. The sidebar
  shows the state plainly enough that chips would be redundant.
  Defer.
- Depends on [[handle-material]] for the Handle facet (same
  caveat as [[filter-dropdowns]] — the facet itself can ship
  greyed out until the field exists, or skip the section until it
  does. Lean: skip it conditionally, same as today).
- Depends on (but doesn't block on) [[distinct-values-api]]. The
  client-side `computeFacets` derivation is still the right
  short-term source; swap to the API when it lands.
- ADR-0006 still applies — read-only UI. No writes.
- Related: [[filter-dropdowns]] is what this supersedes;
  [[knives-index]] for the page structure this lives in.
