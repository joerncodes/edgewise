---
filetype: todo
status: done
---

# Toggle between card and table view on knife lists

The card grid is great for "show me the knives" — image, owner, last
angle, history at a glance. It's less great for "scan 40 entries
sorted by last-sharpened date and spot the outlier". A table makes
the second job trivial.

Add a two-state view toggle (cards / table) to every page that
renders a knife list, with an icon-only button group and tooltips.

## What we want

- **A `ToggleGroup` in the toolbar** with two buttons:
  - `LayoutGrid` icon → "Cards" — current behaviour, default.
  - `Table` icon → "Table" — dense rows, one knife per row.
  - Both buttons carry a tooltip with the label, since the buttons
    themselves are icon-only.
- **Lives on every list page** that today renders a `KnifeCard`
  grid:
  - `/` (homepage)
  - `/backlog`
  - `/owners/[id]`
  - `/manufacturers/[slug]`
  - `/types/[slug]`
  - `/steels/[slug]`
  Same toolbar position on each — between Sort and the existing
  filter affordances.
- **Choice persists across navigations and reloads** —
  `localStorage` key `edgewise:list-view` with value `"cards" |
  "table"`. App-wide, not per-page; if you flipped to table on `/`,
  every list page comes up in table on the next visit.
- **Drag-and-drop on `/backlog` only works in card mode.** When the
  table view is active and the sort is "Manual order", the
  drag-handle column shows the grip, but reordering through a
  table row is its own pattern. Lean: keep manual reorder
  available in table view too — `@dnd-kit`'s sortable works on
  list/table layouts via `verticalListSortingStrategy`. Out of
  scope for the first cut: ship table view *without* drag, and
  add it as a follow-up if it gets missed. Switching to table on
  `/backlog` shows the same "Drag-and-drop is paused" hint that
  filters trigger today.

## Table columns

Order, left to right:

1. Thumbnail (40×40, cover image, square crop; placeholder dot if
   none)
2. Name (link to `/knives/{id}`)
3. Owner (link to `/owners/{id}`)
4. Manufacturer (link, like the existing card chip)
5. Type (link)
6. Steel (link)
7. Last sharpened (`YYYY-MM-DD` + relative — "3 weeks ago" — like
   the card)
8. Last angle (`18°/side`)
9. Sessions (count, right-aligned)
10. Rating (last session's, stars; empty if none)

The row itself is clickable → navigates to `/knives/{id}`, like the
card. Internal links inside cells still navigate to their own
targets — same `relative z-10` pattern the card already uses.

Backlog-page columns are the same minus 7–10 (which are mostly
empty for backlog knives anyway), with "Added" (relative time
since `createdAt`) in their place — matches the existing "added X
ago" line on the backlog cards.

## Open questions

- **Mobile.** A 10-column table needs >800px to be legible. Lean:
  hide the toggle below `md` and force cards. The toggle reappears
  at `md` (≥768px) — narrow tablets still get the choice. Below
  that, cards stay forced regardless of the persisted setting.
- **Sortable column headers in table mode?** Tempting but conflicts
  with the existing Sort dropdown. Lean **defer** — table view
  uses the same Sort dropdown as cards. Revisit once table view is
  in real use and the dropdown feels redundant.
- **Row striping / hover.** Borderless, hover row brightens, no
  zebra. Same border treatment as the rest of the app.
- **Density.** One row ~44px tall. Tighter than the cards but not
  micro. The thumbnail dictates the floor.
- **Empty cells.** Render as `—` muted, not blank. Cards do this
  for missing steel / manufacturer too.
- **Footer total row?** Skip. The count is in the page header
  already.
- **Print stylesheet?** Out of scope.

## Notes for whoever picks this up

- New shadcn components needed: `toggle-group` and `tooltip`.
  Install with `pnpm dlx shadcn@latest add toggle-group tooltip`.
  `table` is already in `src/components/ui/table.tsx`.
- New state hook: `useViewMode()` in `src/lib/use-view-mode.ts`
  (or co-located in `src/components/list-view-toggle.tsx`).
  Reads/writes `localStorage`, returns `[mode, setMode]`. SSR-safe
  with a `useEffect`-set hydration step — default to `"cards"`
  during SSR/first paint.
- New shared toggle: `<ListViewToggle mode onModeChange />` in
  `src/components/list-view-toggle.tsx`. Two `ToggleGroupItem`s
  with `Tooltip` wrapping each. Icons: `LayoutGrid`, `Table` (or
  `Rows3`).
- New shared list renderer: `<KnivesView knives owners mode
  variant?: "all" | "backlog" />` in `src/components/knives-view.tsx`.
  Picks between the existing card grid and the new table per
  `mode`. Extracting it avoids the per-page duplication that's
  already showing up — all six pages would otherwise grow a copy
  of the conditional. Owner-page / manufacturer-page can pass a
  `hideColumns` prop if some columns are redundant on those views
  (e.g. owner page hiding the Owner column).
- The card grid markup currently lives inline in each page. Move
  it into `<KnivesView mode="cards">` and have the existing pages
  call into it; this is the right time to consolidate.
- Drag-and-drop: out of scope for v1, but the `<KnivesView>` API
  should allow a future "make rows sortable" pass without redoing
  the abstraction. Lean: `dnd?: { onReorder(ids: string[]): void }`
  prop the backlog page can pass in later; absent → no drag.
- ADR-0006 still applies — read-only UI, no writes.
- Related: [[knives-index]] for the existing card grid;
  [[backlog-manual-order]] for the drag-and-drop that table mode
  initially skips; [[faceted-filters]] for the toolbar this
  toggle joins.
