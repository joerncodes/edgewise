---
filetype: todo
status: done
---

# Knife subtypes

`type` is currently a single free-text string ("Pocket Knife",
"Chef's Knife", "Santoku", …). That collapses real distinctions:
a Pocket Knife can be a folder or a fixed blade; a Chef's Knife
can be Western or Japanese; etc. The list page, type facet, and
filter all treat those as one bucket.

## What we want

- A second dimension on a knife — call it `subtype` — that
  qualifies `type`. Examples:
  - Pocket Knife → folder, fixed blade
  - Chef's Knife → Western, Japanese (gyuto)
  - Cleaver → vegetable, meat / TCM
- Display as "Pocket Knife — folder" (or whatever separator reads
  cleanly) in the table and on detail pages.
- Filterable independently: "all folders across types", or
  "Pocket Knife → fixed blade only".

## Open questions

- **Open list vs. fixed enum per type.** Open list keeps things
  flexible and matches how `manufacturer` / `steel` / `handle`
  already work (free strings, faceted from observed values). Fixed
  enum per type would catch typos but requires a registry. Lean
  open list, consistent with the rest of the app.
- **Migration.** Existing knives have no subtype. Either leave it
  blank and backfill manually, or write a one-shot script that
  reads the current `notes` field and guesses.
- **URL shape for the type facet.** Currently `/types/<slug>`
  lists all knives of that type. Subtype would either be a
  sub-route (`/types/pocket-knife/folder`) or a query param
  (`?subtype=folder`). Sub-route is more discoverable; query is
  simpler.

## Where to look

- **`src/lib/storage/types.ts`** — `KnifeSchema` adds an optional
  `subtype: string` (consistent with how `type` is shaped).
- **`src/components/knives-view.tsx`** — `ALL_COLUMNS` either
  gains a `"subtype"` column, or the existing `"type"` column
  renders as `type — subtype` when subtype is present. Probably
  the latter, to avoid bloating the table.
- **`src/app/types/[slug]/page.tsx`** and the type facet —
  decide on URL shape, surface subtype as a secondary filter.
- **`docs/data-model.md`** — document the new field once the
  shape lands.

## While in there

The current type list has both `Santoku` and `santoku` — two
buckets that should be one. Normalize case (or pick a canonical
form) when touching this code.
