---
filetype: todo
status: open
---

# Janitor view — surface knives with missing fields

Fountain Pen Companion has a "Missing reviews" and "Missing
descriptions" section that quietly nudges the community to backfill
sparse entries. Same idea for a single-user app: a page that lists
*your own* knives with gaps in their metadata, so you can patch the
data instead of letting drift accumulate.

## What we want

- A `/janitor` page (probably under the wordmark overflow or as a
  small link from `/stats`). Title: "Janitor" or "What's missing".
- A handful of sections, each listing knives that meet a "missing X"
  predicate. Each section header has the count, e.g.
  `7 knives without a photo`. Each row links to the knife detail
  page so you can fix it.
- Predicates to start with:
  - **No photo** — `images.length === 0`.
  - **No sessions yet** — `sessions.length === 0`.
  - **No steel recorded** — `steel.trim() === ""`.
  - **No type recorded** — `type.trim() === ""`.
  - **No manufacturer recorded** — `manufacturer.trim() === ""`.
  - **No notes** — `notes.trim() === ""`.
  - **Stale: not sharpened in over 12 months** — borderline-janitor,
    but it fits the "needs attention" framing.
- Empty sections collapse to a quiet "All clean" line, not omitted —
  the empty state is itself a satisfying signal.
- Same data via `GET /api/janitor` for scripted backfill. Returns a
  map keyed by predicate name, value is an array of knife IDs.

## What it's good for

- **Backfill without nagging.** The page is opt-in. No red badges in
  the nav, no "you have unfinished items" guilt — just a tidy room
  to visit when you feel like it.
- **Catches data drift early.** Right now there's no surface that
  shows "this knife is missing X". You only notice when you click
  through and feel the gap.
- **API-first backfill.** A Claude session can hit `/api/janitor`,
  identify the gaps, prompt you for the missing info, and PATCH the
  knives — perfect for "let's clean up the corpus" sit-down sessions.

## Open questions

- **What counts as "missing"?** The predicates above are the
  obvious lot. Resist adding obscure ones (e.g. "no caption on any
  image", "no rating on any session") — they're noisy and most
  knives never had those filled out. Add later if a specific gap
  starts feeling annoying.
- **One page or per-predicate?** One page is simpler and lets you
  scan everything at once. Per-predicate (`/janitor/no-photo`) is
  cleaner for deep cleaning sessions. Lean one page with collapsible
  sections; promote to per-predicate routes only if a single section
  grows past ~30 entries.
- **"Stale" cutoff.** 12 months feels right for kitchen knives; for
  collector blades it'd be misleading. Make the cutoff configurable
  via query param (`?staleAfterDays=365`) but default to 365.
- **Should it offer one-tap fix UI?** Tempting — "click the empty
  steel field, type, save" inline. Per ADR-0006, writes go through
  the API and the UI is read-only. Stick to that: the janitor row
  links to the knife detail page, which (when an edit UI eventually
  ships) handles the patch. Don't make janitor the place where edit
  UI first appears.

## Notes for whoever picks this up

- Pure derived view — no schema change, no new storage.
- Compute in `src/lib/janitor.ts` mirroring `src/lib/stats.ts`. Takes
  `Knife[]` and returns `{ noPhoto: Knife[], noSessions: Knife[], … }`.
- Route handler `src/app/api/janitor/route.ts` returns the same shape
  as JSON. Page fetches it via `api.getJanitor()`.
- Use a single Lucide icon for the page — `Broom` (if present) or
  `Sparkle` to keep the "tidy" vibe. (`Sparkles` is already in use
  for the hero card; pick something else, e.g. `Wand`, `Brush`, or
  the existing `ChevronRight` family.)
- ADR-0009 self-docs: add the endpoint to `/api/docs` and
  `docs/api.md` when this ships.
- Don't show this in the main nav — it's a maintenance lens, not a
  primary view. Link from the masthead overflow or from `/stats`.
- Plays well with [[diary]] and [[stats]] as the third "lens" page:
  stats is aggregated, diary is chronological, janitor is gap-led.
