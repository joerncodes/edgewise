---
filetype: adr
id: "0012"
title: The homepage hero only renders in cards view
status: accepted
date: 2026-06-10
---

# Context

The homepage (`/`) picks a "Most recently sharpened" hero — the
single newest-sharpened knife that has at least one image — and
renders it as an oversized featured `KnifeCard` above the regular
grid. The grid is then `filteredSorted.filter(k => k.id !== heroKnife.id)`
so the hero isn't shown twice.

The list-view toggle (see `docs/todos/list-view-toggle.md`) added a
table mode whose entire reason for existing is "scan 40 entries at
a glance and spot the outlier". That job is incompatible with the
hero treatment:

- **The hero is a photo.** Table rows are 44px tall with a 40×40
  thumbnail; a hero card is ~250px of dedicated landing-page real
  estate. Rendering both above the same data feels schizophrenic.
- **Excluding the hero from the table breaks the table's job.**
  If you sorted by "Longest since sharpened" and the hero is the
  *most recently* sharpened, fine — it sits in its own block.
  But on any other sort the hero is just an arbitrary row missing
  from the list. The user came to the table to see the whole list
  sorted; ripping out one knife violates that.
- **Including the hero card *and* the table is worst-of-both.**
  Photo at the top, then the same knife appears again in row 1
  (or row N, depending on sort). Visual stutter.

# Decision

In `table` mode the hero is suppressed entirely. The featured
card does not render, and the chosen knife appears in the table
alongside every other one — same row treatment, no special
position.

In `cards` mode the existing behaviour is unchanged: hero card
above, grid below with that knife removed from the grid.

The selection criterion stays the same (latest-sharpened knife
with at least one image). The hero is also suppressed when any
filter or search is active — that rule predates this ADR and is
unaffected.

# Consequences

- **The table is the complete list.** No "where is X?" confusion.
  Every knife appears exactly once.
- **The toggle becomes a real mode switch.** Cards view is
  presentational (hero, photos, room); table view is
  utilitarian (dense, sortable, scannable). Persisting the
  choice in localStorage (`edgewise:list-view`) is now more
  meaningful — the user is picking *what kind of page* they
  want, not just a cell style.
- **One implementation branch.** The hero computation in
  `src/app/page.tsx` checks `viewMode === "table"` and returns
  `undefined` early. `gridKnives` falls back to the full
  `filteredSorted` automatically.
- **The backlog page is unaffected.** It never had a hero.

# Alternatives considered

- **Render the hero in table mode as a "pinned" first row,
  visually distinct.** Adds a row treatment that doesn't appear
  anywhere else, fights the table's "every row equal" premise,
  and still leaves an awkward gap if the user sorts and the
  pinned row is no longer naturally first. Rejected.
- **Render the hero card above the table.** Keeps the photo
  but breaks the "table is the complete list" property — the
  hero is now both above and absent from below. Rejected.
- **Drop the hero everywhere.** Tempting for consistency, but
  the hero is genuinely useful in cards view as a landing
  focal point. Card-view users like it; the toggle gives
  table users a clean alternative.

# How to apply

In `src/app/page.tsx`:

```ts
const heroKnife = useMemo(() => {
  if (isFilterActive || viewMode === "table") return undefined;
  // …existing candidate selection
}, [knives, isFilterActive, viewMode]);
```

Nothing else changes. `gridKnives` already does the right thing
when `heroKnife` is `undefined`.
