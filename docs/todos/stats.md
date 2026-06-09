---
filetype: todo
status: open
---

# Stats dashboard

A `/stats` page that turns the data we already capture into something
worth looking at — sessions over time, who gets sharpened most, which
angles and steels dominate. No new on-disk fields; pure derived view.

## What we want

- A single `/stats` page, calm and chart-led, that surfaces patterns
  hiding in the markdown corpus.
- Same numbers available as JSON via `GET /api/stats` so Claude / curl
  scripts can grab them without scraping HTML.
- Nothing that requires a new schema field — if the data isn't already
  in frontmatter, it doesn't go on this page yet.

## Candidate panels

- **Sessions per month.** Bar chart, last 12–24 months. Idle months
  visible as gaps, not omitted.
- **Sharpenings per owner.** Horizontal bars, descending. Click-through
  to `/owners/<id>`.
- **Angle distribution.** Histogram across all sessions. Tells you
  whether you're a 15°-everything person or actually vary by knife.
- **Steel mix.** Donut or stacked bar of steels across the collection.
  Skip blanks.
- **Type mix.** Same idea for `Knife.type`.
- **Top knives by session count.** Which blades you've worked on most.
  Useful for "which one am I bored of yet?"
- **Longest gap since last session.** Companion to the overdue idea —
  surfaces neglected knives without needing a separate `/overdue` page.

## Open questions

- **Chart library.** Three options:
  1. Recharts. shadcn already ships chart components on top of it
     (`pnpm dlx shadcn@latest add chart`). Cheapest path, matches the
     rest of the UI.
  2. Hand-rolled SVG. Fine for the small charts (bars, histogram), no
     dependency. More work for the donut.
  3. Visx / Observable Plot. Overkill for this scale.
  Lean (1).
- **Computed where?** Two options:
  1. Server component reads all knives via `getStorage()` and computes
     in-process. Simple, fast at this scale, no client JS for math.
  2. `GET /api/stats` returns the JSON and the page fetches it. Matches
     the API-first pattern, costs a roundtrip.
  Probably ship both: server component for the page, plus an
  `/api/stats` endpoint that returns the same payload for non-UI
  clients. The endpoint can `import` the same compute function the page
  uses — that's the seam, not a duplicated calculation.
- **Time bucketing.** Month is the obvious unit. Week is too noisy at
  hobbyist volume; year hides too much. Stick with month.
- **Empty states.** Each panel needs a sensible "not enough data yet"
  message — a single knife with one session shouldn't render a sad
  one-bar chart.

## Notes for whoever picks this up

- ADR-0006 still applies: read-only page, no inline editing.
- Add a nav link only if there's room; otherwise this can live as a
  link from the home page footer or the masthead overflow.
- Don't persist any aggregates. Recompute on every request — corpus is
  tiny and markdown is the source of truth.
- If a panel needs a field that doesn't exist yet (e.g. stones), don't
  invent it here — open a separate todo and let `/stats` pick it up
  once it lands.
