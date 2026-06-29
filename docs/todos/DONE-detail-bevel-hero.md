---
filetype: todo
status: done
---

# Bevel hero on the knife detail page

The most knife-specific visual we own — the `EdgeV` cross-section
diagram — appears on the **card** but is completely absent from the
**detail page**. The page about a single knife reduces its edge
geometry, the one thing a sharpener actually cares about, to a single
gray row: `Last sharpened … @ 20°`.

That's backwards. The detail page is the climax; it should open with
the most characteristic thing in the subject's world. For a knife,
that's its angle.

## What we want

- A focal "bevel" block near the title on `/knives/[id]`, above or
  beside the property list:
  - A large `EdgeV` cross-section (the same one the card draws,
    scaled up).
  - The per-side angle in big Oswald/mono — `20°/side`.
  - `40° inclusive` beneath it, quieter.
  - The last-sharpened date alongside, so the geometry has a "when".
- Reuse the card's exact vocabulary (`X°/side · 2X° inclusive`) so the
  detail page reads as the payoff the card promises, not a different
  app.
- Graceful empty state when no session exists yet: mirror the card's
  "No bevel recorded yet" rather than rendering a broken diagram.

## Where to look

- **`src/components/knife-card.tsx`** — `EdgeV` lives here as a local
  component (`function EdgeV({ angle })`). Promote it to its own file
  (e.g. `src/components/edge-v.tsx`) so both the card and the detail
  page import it instead of duplicating the SVG.
- **`src/app/knives/[id]/page.tsx`** — the `header` block (`~:268`)
  and the `DetailBody` property list (`~:479`). The bevel hero slots
  between the title/owner and the rest.

## Related

- [[DONE-detail-chip-vocabulary]] — the same "the card is more
  characterful than the detail page" problem, applied to the
  metadata chips.
- [[DONE-detail-dedupe-facts]] — once the bevel block owns "last sharpened
  + angle", the redundant property rows can go.
- [[DONE-rating-sparkline]] — the sparkline already lives in the
  header; the bevel block should sit comfortably next to it.
