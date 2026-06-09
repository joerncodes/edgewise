---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Steels as first-class entities with persistent markdown notes

> **Done.** Implemented 2026-06-09. `Steel` entity stored under
> `$DATA_DIR/steels/<slug>.md`, full CRUD via `/api/steels` and
> `/api/steels/{id}` (409 on delete-if-referenced). `Knife.steel`
> stays a soft FK — unknown strings are not rejected; the steel page
> derives from knife frontmatter when no record exists and shows a
> "no notes yet" hint. `/steels` list page mirrors `/manufacturers`;
> `/steels/<slug>` shows composition, the markdown notes via the
> existing `<Markdown>` component, and a `KnifeCard` grid. Atom icon
> in the nav. Data-model + api docs + the `/api/docs` endpoint were
> all updated per ADR-0009.

Right now, steel is a free-form string on the knife. `/manufacturers`
and `/types` derive their list pages by grouping that string across
the corpus — no separate storage, no per-entity notes. That falls
apart for steels because steel-level information is genuinely
*shared*: 80Crv2 is high-carbon and needs to be wiped dry no matter
which knife it's on. Today we either repeat that on every knife's
notes (lossy, drifts) or it lives nowhere.

Promote steels to their own entity so a knife's `steel` string is a
foreign key, and `/steels/<slug>` is a page whose markdown body is
edited and persisted independently of any knife.

## What we want

- `Steel` entity stored as `$DATA_DIR/steels/<slug>.md`, mirroring
  `Owner`: YAML frontmatter for structured fields, body for notes.
- `/steels` list page — every distinct steel, count of knives using
  it, sorted by usage descending. Style mirrors `/manufacturers`
  and `/types`.
- `/steels/<slug>` detail page — header, the markdown notes (rendered
  via the existing `<Markdown>` component), then a card grid of
  every knife using this steel.
- Full CRUD via `/api/steels` and `/api/steels/{id}` following the
  same conventions as `/api/owners`.
- The knife's `steel` field stays a string but becomes a soft FK: it
  matches a steel's `id` when present, but unknown strings still
  display (no rejection on create — see open questions).

## Fields

Minimal v1:

- `id` — slug, derived from `name` via `slugify()` (so `80Crv2` →
  `80crv2`).
- `name` — canonical display name (free-form, e.g. `80CrV2`, `AUS-8`,
  `X50CrMoV15`).
- `composition` — optional free-form string for the alloy formula.
- `notes` — markdown body. This is the whole point of the feature:
  per-steel persistent notes (rust care, sharpening tips, "rolls a
  burr easily on hard stones", etc.) that survive independently of
  any knife.
- `createdAt` / `updatedAt`.

Deliberately *not* in v1: hardness range, manufacturer associations,
"similar to" cross-links. Add them when you actually want them; don't
speculate.

## Referential rules

- `Knife.steel` is a **soft** reference. The string should match an
  existing `Steel.id` (slugified), but the API does NOT reject
  unknown strings — this lets you record a knife before researching
  its steel, and lets the steel notes get backfilled later. See open
  questions for the tighter alternative.
- Deleting a steel that any knife references → 409. Mirror the
  owner-with-knives rule.

## Markdown persistence

This is the headline of the todo and the main reason this isn't just
a derived view:

- The `notes` body is read from `<id>.md` and written via
  `PATCH /api/steels/{id}`. Same as owner notes today.
- The notes are NOT scraped from any knife. They live on the steel.
- The detail page renders them with the existing `<Markdown>`
  component (already used by knife notes), so headings, bullet
  lists, links, and inline code all work.

## Open questions

- **Hard FK or soft FK?** Three options:
  1. **Soft** (above): unknown `steel` strings on a knife display as-
     is, no rejection. Pragmatic. You can create a knife the moment
     you know what to call it, even if you haven't profiled the
     steel yet.
  2. **Hard FK**: `Knife.steel` must match an existing steel ID.
     Forces discipline; annoying when you're triaging a stack of
     incoming knives.
  3. **Auto-promote**: on knife create, if `steel` doesn't match any
     existing steel, mint a new `Steel` row with that name. Frees
     the user from the bookkeeping but creates a lot of empty
     `Steel.notes` shells.
  Lean (1) for v1. Promote to (2) only after the corpus is mostly
  steel-aware, if ever.
- **Slug canonicalization.** Steel names are case- and punctuation-
  weird: `80CrV2`, `80Crv2`, `80-CrV-2`, `AUS-8`, `AUS8`. The
  manufacturer list page already handles spelling drift by lowercasing
  for grouping. Reuse that pattern in `groupSteels()`. The persistent
  `Steel` entity uses one canonical slug per logical steel; the home
  page card and knife detail page show the spelling from
  `Knife.steel` verbatim but link to `/steels/<slug>` where the slug
  derives from that string. Document this in `docs/data-model.md`.
- **Migration of existing steel strings.** Existing knives have a
  steel string but no `Steel.<slug>.md` exists. Two paths:
  1. One-shot script that walks every knife's `steel`, dedupes,
     creates a `Steel` row with empty notes for each. Run once.
  2. Lazy: detail page renders fine without a `Steel` row (uses the
     raw `Knife.steel` string), and the `/steels` list page derives
     from knife frontmatter for any steel without a corresponding
     row, falling back to "no notes yet" on the detail page.
  Lean (2) — keeps the corpus honest and avoids generating empty
  shell files.

## Notes for whoever picks this up

- ADR-0004 (storage seam) applies: implement everything via the
  `Storage` interface. Add `listSteels`/`getSteel`/`saveSteel`/
  `deleteSteel` to `Storage`. Don't branch on implementation
  elsewhere.
- ADR-0006 (API-only CRUD) applies: writes go through `/api/steels*`,
  not Server Actions. UI is read-only for now — the markdown notes
  get edited via the API. (When a UI edit affordance ships later,
  it still hits the API.)
- ADR-0009 (self-docs): every new endpoint updates `/api/docs`,
  including the new `/api/steels*` routes and the soft-FK note on
  `Knife.steel`.
- Update `docs/data-model.md` with the new entity, the soft-FK rule,
  and the slug canonicalization note.
- Reuse the existing `KnifeCard` for the per-steel grid on
  `/steels/<slug>`, same as `/manufacturers/<slug>` and
  `/types/<slug>` do today.
- The `/stats` page ([[stats]]) could grow a "by steel" panel that
  links into `/steels/<slug>` once this lands — out of scope for the
  todo, but a one-line update.
