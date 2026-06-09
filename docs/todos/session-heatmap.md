---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Year-view session heatmap

> **Done.** Implemented 2026-06-09 as a panel on `/stats`
> ("Sharpening rhythm"). 53×7 CSS-grid of brass-tinted cells, last 53
> weeks anchored to Monday. `Stats.dailySessionCounts` carries the
> dense daily series so external clients get the same data. No chart
> dependency added. Mobile falls back to horizontal scroll on narrow
> widths.

A calendar grid of every day in a rolling 12-month window, each cell
shaded by how many sharpening sessions happened that day. Inspired by
GitHub's contribution graph and Strava's training calendar. Sparse
data (a hobbyist sharpener doesn't touch a stone every day) renders
beautifully in this format — every active day stands out.

## What we want

- A new panel on `/stats` (or a dedicated `/stats/heatmap` route — see
  open questions). Title: "Sharpening rhythm" or similar.
- 53 columns × 7 rows, week-on-week, last 12 months ending today.
  Weekday labels on the left (`Mo … Su`), month labels along the top
  at the column where each month starts.
- Each cell: a small square (~12px), color from a 5-step ramp tied
  to session count (0 / 1 / 2 / 3 / 4+). 0 sessions is a quiet
  border-tinted square; 4+ is full brass.
- Hover (or tap on mobile) reveals "2026-03-04 · 1 session on
  Jan's Le Petit Chef" via a native `title` attribute (no extra
  popover library).
- Same data shape comes back from `/api/stats` so external clients
  can grab it. Add `dailySessionCounts: { date: string, count:
  number }[]` to `Stats`.

## What it's good for

- **Rhythm at a glance.** "I always sharpen in November, never in
  July" pops out instantly.
- **Streak / cadence vibes.** Bench-tool feel — the page rewards
  consistency in a way a bar chart doesn't.
- **Single-image "year in review".** Drop a screenshot in a
  year-end retrospective and it's instantly readable.

## Open questions

- **Where does it live?** Two options:
  1. New panel inside `/stats`, below "Sessions per month". Reuses
     the existing layout.
  2. New `/stats/heatmap` route for the canvas-style full-bleed
     treatment. Better photo presence.
  Lean (1) for v1; promote to (2) if the heatmap becomes the thing
  you keep linking people to.
- **Rolling 12 months vs. calendar year.** Rolling 12 months always
  fills the grid; calendar year leaves January–June empty until
  mid-year. Lean rolling. Add a "View 2025 / 2024 / …" toggle later
  if you want a year-in-review mode.
- **Render technology.** Three options:
  1. Plain CSS grid + `<div>` cells. No SVG, no library. Matches the
     existing CSS-bar approach in `src/components/stats/*`.
  2. SVG. Slightly nicer for tooltips and exporting as an image.
  3. A heatmap lib (e.g. react-calendar-heatmap). Avoid — same logic
     in fewer lines but a dependency.
  Lean (1). Cells are tiny squares; CSS grid handles it.
- **Color ramp.** Tie to the existing brass color: 0 = `bg-border/40`,
  1 = `bg-brass/20`, 2 = `bg-brass/40`, 3 = `bg-brass/60`, 4+ =
  `bg-brass`. Dark mode same (brass is the same hex). Verify
  contrast — the 0/1 step is the most likely to wash out.
- **Click behaviour.** Default: nothing. Stretch: click a day filters
  the diary ([[diary]]) to that date. Skip for v1.

## Notes for whoever picks this up

- Compute happens in `src/lib/stats.ts` (extend `Stats` with
  `dailySessionCounts`) so the heatmap shares the same endpoint as
  the existing panels.
- Build the date list densely: for the last 365 days, even if the
  count is 0. Empty cells matter for the visual grid.
- Component lives at `src/components/stats/heatmap.tsx`, mirrors the
  shape of `month-bars.tsx`/`bar-list.tsx`.
- Native `title` is fine for hover detail; don't pull in a tooltip
  library for this.
- Accessibility: add `aria-label="3 sessions on 2026-03-04"` on each
  cell. Keyboard nav is overkill for v1.
- Mobile: 53 columns won't fit. Either horizontal scroll
  (`overflow-x-auto`) or shrink to last 6 months at narrow widths.
  Lean horizontal scroll — preserves the year-view feeling.
