---
filetype: todo
status: done
---

# Small subject-driven polish on the detail page

Two minor spots where a generic default crept into an otherwise
intentional, subject-driven design. Low effort, nice payoff.

**1. Generic timeline markers.** The sessions timeline uses textbook
dots — `h-2 w-2 rounded-full bg-border` on a left border (`~:604`).
It's the default AI timeline. The marker could *encode something*: tint
or size it by the session's rating, or use a tiny edge tick that fits
the brass-and-steel workshop vocabulary, so the markers carry meaning
instead of just decorating.

**2. Bare loading state.** The page falls back to a plain
`Loading…` string (`~:250`) while the knife fetches, even though a
`Skeleton` component already exists. A skeleton that roughly matches the
detail layout (title, bevel/metadata, gallery) reads as more finished
and avoids the layout jump when data lands.

## What we want

- Timeline markers that reflect the session — rating-driven tint/size,
  or a small edge-tick glyph. Keep it subtle; this is a flourish, not a
  focal point.
- A skeleton loading state for `/knives/[id]` instead of the `Loading…`
  text.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — the marker `<span>` in the
  sessions `<ol>` (`~:604`), and the loading guard (`~:250`).
- **`src/components/ui/skeleton.tsx`** — the existing skeleton
  primitive.
- **`src/components/stars.tsx`** — the rating's half-step rounding, if
  markers key off rating.

## Related

- [[DONE-detail-bevel-hero]] / [[DONE-detail-layout-hierarchy]] — do those
  first; the skeleton should match whatever the final top-of-page
  layout becomes.
