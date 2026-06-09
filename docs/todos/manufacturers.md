---
filetype: todo
status: open
---

# List page for manufacturers

A `/manufacturers` page that lists every manufacturer that appears on any
knife, with a count and a link to drill down to the knives by that maker.

## What we want

- One row per distinct manufacturer found across all knives' frontmatter
  (`Knife.manufacturer`, currently an optional string).
- Show how many knives use that manufacturer.
- Click through to a filtered view of those knives.
- Skip knives where `manufacturer` is blank — don't render an empty-name
  entry.

## Open questions

- **First-class entity, or derived view?** The cheap path is fully derived:
  read all knives, group by `manufacturer` string, render. No new storage,
  no new API. Downside: no per-manufacturer notes, no logo, no canonical
  spelling. Probably right for v1 — promote later if it starts feeling
  thin. (If we promote, it gets the same treatment as `Owner`: file per
  manufacturer under `data/manufacturers/<slug>.md`, foreign-keyed by slug
  on the knife, plus the API endpoints and the cascade rules from
  ADR-0006.)
- **Normalization.** Frontmatter strings will drift (`Wüsthof` vs
  `Wusthof` vs `wüsthof`). v1: trim + group case-insensitively, display
  the most common casing. Document the rule in `docs/data-model.md` so the
  next person doesn't reinvent it.
- **Drill-down URL.** Three options:
  1. New route `/manufacturers/<slug>` showing a card grid scoped to that
     manufacturer.
  2. Reuse the home page's controls — add a `?manufacturer=…` query param
     that pre-selects a filter. Cheaper, but means adding a manufacturer
     filter to the home page first.
  3. Link directly to the home page with the search box pre-filled. Even
     cheaper; worse semantics (matches knives whose *name* contains the
     manufacturer string too).
  Lean (1) for symmetry with `/owners/<id>`.
- **Where does the nav link live?** Header gets cluttered fast. Could fit
  `Owners · Manufacturers` and stop there. Or only surface manufacturers
  from the home page somehow.

## Notes for whoever picks this up

- ADR-0006 still applies: read-only page, no inline create/edit.
- Sort default: by count descending (most-used maker first), tiebreak by
  name. A name-A–Z toggle is nice-to-have, not required.
- Empty state: "No manufacturers recorded yet — add `manufacturer:` to a
  knife's frontmatter via the API."
- If a knife's manufacturer is misspelled, the only way to fix it today is
  `PATCH /api/knives/<id>`. That's fine — don't build a rename tool yet.
