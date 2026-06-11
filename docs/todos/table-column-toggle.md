---
filetype: todo
status: open
---

# Checkboxes for table columns in table view

The table in `KnivesView` (`src/components/knives-view.tsx`) renders
a fixed set of columns from `ALL_COLUMNS` / `BACKLOG_COLUMNS`. The
only escape hatch is the `hideColumns` prop, which a few specific
pages use (e.g. `/manufacturers/[slug]` hides the manufacturer
column because every row would be the same). The user can't toggle
columns themselves — useful when you've added a column the user
doesn't always want to see (handle material being the immediate
trigger) and to let people compress the table on narrow screens
without losing the view mode.

## What we want

- A column-picker affordance on table view: a button (e.g. a
  `Columns3` icon from lucide) that opens a popover with a
  checkbox per column. Same shape as the existing filter sheet on
  mobile.
- Sits in the toolbar row next to `ListViewToggle`, only visible
  when `mode === "table"`.
- Persists across reloads in `localStorage`, keyed per-route so
  `/`, `/backlog`, and `/handles/[slug]` can have different
  defaults. Mirror the pattern in `useViewMode()`
  (`src/components/list-view-toggle.tsx`).
- The thumbnail column should always be on; everything else
  user-controllable. Optional: pin "name" too — a table without
  the name column is useless.

## Where to look

- **`src/components/knives-view.tsx`** — `ALL_COLUMNS` /
  `BACKLOG_COLUMNS` define the menu of columns. `COLUMN_LABELS`
  has the display strings. The `hideColumns` prop is already the
  mechanism — the new picker just feeds it a user-chosen set.
- **`src/components/list-view-toggle.tsx`** — `useViewMode()` is
  the precedent for a small UI preference persisted in
  `localStorage`. Build `useTableColumns(routeKey)` next to it.
- **`src/app/page.tsx`**, **`src/app/backlog/page.tsx`**, the
  `/handles/[slug]`, `/manufacturers/[slug]`, `/steels/[slug]`,
  `/types/[slug]` pages — all render `<KnivesView>`. The picker
  belongs on each of them in table mode. A small helper component
  next to `ListViewToggle` keeps it DRY.

## Open questions

- **Column ordering.** Currently fixed by `ALL_COLUMNS`. Do we let
  users reorder, or just toggle visibility? Start with toggle
  only; drag-to-reorder is a much bigger UI undertaking and
  there's no demand yet.
- **Per-route vs global default.** Per-route gives the most
  control — handle column on by default on `/`, off on
  `/backlog`. Global is simpler but you'd reconfigure every time
  you change views. Lean per-route; the `useViewMode()` precedent
  is also per-route.
- **Mobile.** The table is already horizontally scrollable on
  small screens. The picker is probably more useful there than on
  desktop — gives users a way to cut the table down to just
  name + last-sharpened, say. Make sure the popover works in the
  filter sheet flow.
- **Backlog manual-order column.** In `/backlog` table mode the
  drag-handle column is added by `onReorder` being present, not
  by `BACKLOG_COLUMNS`. The picker shouldn't be able to hide it.
  Keep it as a structural column, outside the user-toggleable
  set.

## Out of scope

- Resizable columns. Tables are dense enough; users who want
  more control can switch to card view.
- Saving "named views" (e.g. "minimal", "full"). One persisted
  set per route is plenty.
- Exporting the table — CSV / clipboard export is a separate todo
  if it ever comes up.

## Related

- `src/components/list-view-toggle.tsx` — the persistence
  pattern.
- [[DONE-list-view-toggle]] — the precedent for a per-route UI
  preference.
- [[DONE-handle-material]] — the immediate reason the table is
  wider than the user might want by default.
