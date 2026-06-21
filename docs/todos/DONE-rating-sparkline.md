---
filetype: todo
status: done
---

# Rating sparkline on the knife detail page

Every session can carry a `rating` (1–5, free precision). Today
those ratings show up as stars on individual sessions and nowhere
else. The honest question — "am I getting better at sharpening
*this* knife over time?" — would answer itself with a tiny line
chart on the detail page.

## What we want

- A small sparkline at the top of `/knives/[id]`, next to the
  hero info. X = session index (or date), Y = rating. Maybe 12
  sessions wide; trims older ones to keep it readable.
- Rendered with the same approach as the session heatmap from
  [[DONE-session-heatmap]] — inline SVG, no charting library.
  This is a single polyline plus dots.
- Hidden when fewer than 3 rated sessions exist on the knife —
  two points isn't a trend, and an empty chart is just noise.
- Hover/tap a dot → tooltip with the session's date and rating.
  Optional first iteration; can ship the line alone.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — the detail page composes
  the hero block, sessions table, image gallery, etc. Slot the
  sparkline into the hero.
- **`src/components/session-heatmap.tsx`** (or wherever the
  janitor / stats heatmap lives) — inline-SVG precedent. Copy the
  visual approach, not the data.
- **`src/components/stars.tsx`** — the rating's display logic is
  here; the sparkline should match the rounding/half-step
  treatment so the dots agree with the stars below.

## Open questions

- **X axis: index or date?** Index is honest about "the Nth time
  I sharpened this" and avoids long flat gaps when a knife sits
  for months. Date is honest about "this happened in Q3."
  Lean index; the date is already visible in the sessions table
  below.
- **Sessions without a rating.** Skip them, or render a gap?
  Skip → cleaner trend. Gap → more honest about coverage. Start
  with skip; revisit if it feels misleading.
- **Aggregate sparkline somewhere else?** Could surface per-owner
  ("am I getting better at Guido's stuff in particular?") on
  `/owners/[id]`. Probably later — start narrow on the knife
  page and see if it's useful.

## Out of scope

- Charting library (recharts, visx, etc.). Inline SVG is enough
  for a 12-point line.
- Predictive trend lines / regression. Cute, not honest at this
  scale.
- Rating-vs-abrasives correlation. That's a stats-page question,
  not a per-knife one.

## Related

- [[DONE-session-rating]] — the rating field itself.
- [[DONE-session-heatmap]] — the inline-SVG visual precedent.
- [[DONE-stats]] — broader aggregate stats live there.
