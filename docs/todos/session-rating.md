---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Subjective star rating on sharpening sessions

> **Done.** Implemented 2026-06-09. `SharpeningSession.rating` is an
> optional float in `[1, 5]`. UI rounds to nearest half-step and
> renders five lucide `Star`/`StarHalf` icons via
> `src/components/stars.tsx`. Stars appear on the home-card last-
> session line, in the per-card history rows, and on the knife
> detail page's session timeline. `docs/data-model.md`, `docs/api.md`,
> and the `/api/docs` endpoint (ADR-0009) were updated.

Sometimes a session goes great (mirror polish, butter-cut tomato test
passes), sometimes it's fine but unremarkable, sometimes you fight the
geometry the whole way. Capture that as a per-session rating so you
can see at a glance how a knife has been treating you over time.

## What we want

- A new optional `rating` field on `SharpeningSession`, a float in
  `[1, 5]`. Free-precision (e.g. `2.6`), no enum.
- Render as a row of five stars — full or half — using the nearest
  half-step (so `2.6` → 2.5 stars, `4.8` → 5 stars). The underlying
  value stays exact in the markdown; the rounding is purely a display
  decision.
- Pure addition to the API: `POST /api/knives/{id}/sessions` accepts
  the field; pre-existing sessions without it stay valid.
- UI surfaces it wherever a session is listed: the knife detail page's
  session timeline, the home page card's "last sharpened" line (where
  it can render inline next to the date/angle).

## Open questions

- **Range start at 0 or 1?** A 1-star floor matches the "subjective
  vibe" framing — even a bad session is at least one star, because
  the knife is sharper than before. A 0-floor invites pointless
  zero-rated entries. Lean: clamp to `[1, 5]` in the Zod schema, but
  make the field optional so "I didn't bother rating this" stays
  expressible.
- **Half-step or fully continuous display?** Three options:
  1. Round to nearest 0.5, render full/half stars. Cleanest visual.
     Lean.
  2. Render as a partial-fill gradient (e.g. `2.6` → 52% of the third
     star filled). More precise, more SVG work.
  3. Skip stars entirely and render as a number with a label. Boring.
  v1: option (1).
- **Where does it appear on the home card?** The card already shows
  the last session's date and angle. Add stars to that line, but only
  if the last session has a rating — don't render an empty row of
  five outlines for unrated sessions.
- **Icons.** `lucide-react` exposes `Star`, `StarHalf`, and an
  outline variant. Use those rather than custom SVG to stay
  consistent with the rest of the UI.

## Notes for whoever picks this up

- Schema change in `src/lib/storage/types.ts` (`SharpeningSessionSchema`):
  `rating: z.number().min(1).max(5).optional()`. This is additive, no
  migration needed.
- Update `docs/data-model.md` to describe the new field and the
  half-step display rule.
- Update `docs/api.md` and the `/api/docs` endpoint (ADR-0009) once
  the schema change ships — the Zod-generated schema section will
  pick up the field automatically, but the curl examples and the
  prose should mention it.
- Stats (`/api/stats`, see [[stats]]) could grow an "average rating
  per knife" or "rating distribution" panel later — out of scope for
  this todo, but a one-line aggregation in `src/lib/stats.ts` will do.
- Don't add an editing UI yet. ADR-0006 still applies: writes via the
  API, the existing `POST /api/knives/{id}/sessions` endpoint gains
  the field. The bench-capture todo ([[bench-capture]] if it ever
  lands) is the natural place for a "tap a star count" affordance.
