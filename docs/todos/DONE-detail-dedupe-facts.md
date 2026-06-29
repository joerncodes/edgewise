---
filetype: todo
status: done
---

# Stop repeating the same facts on the detail page

Several facts are stated three or four times on `/knives/[id]`. Repeated
information reads as clutter, not thoroughness.

The sharpening count appears in:

1. The rating sparkline footer — "X sharpenings".
2. The `PropertyList` — `Sharpenings: X`.
3. The sessions section header — "X sharpenings".

And these are doubled too:

- **Owner** — under the H1 (`~:301`) *and* as the first `PropertyRow`
  (`~:481`).
- **Last sharpened** — its own `PropertyRow` (`~:549`) duplicates what
  the first entry of the sessions timeline already shows.

## What we want

- Each fact has exactly one home:
  - **Owner** — keep it under the title (it's identity, belongs in the
    header). Drop the property row.
  - **Sharpening count** — let the section header own it; drop the
    `Sharpenings` property row. The sparkline's footer count is fine
    to keep since it's scoped to "rated sessions in the chart".
  - **Last sharpened** — folds into the bevel hero
    ([[DONE-detail-bevel-hero]]); drop the standalone property row.
- After the cuts, re-check whether `PropertyList` still earns its place
  or whether chips ([[DONE-detail-chip-vocabulary]]) plus the bevel hero
  cover everything.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — `header` (`~:268`) and
  `DetailBody` (`~:434`). The duplicated rows are in the
  `PropertyList`.

## Related

- [[DONE-detail-bevel-hero]] — absorbs "last sharpened + angle".
- [[DONE-detail-chip-vocabulary]] — absorbs the metadata rows.
