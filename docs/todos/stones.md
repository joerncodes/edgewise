---
filetype: todo
status: done
---

# Stones as first-class entities

Sharpening sessions implicitly use stones, but right now stones are
invisible to the app. Promote them to their own entity, link them from
sessions, and surface a `/stones` page so you can see grit progression,
total uses, and when something probably needs flattening. This is the
single most hobbyist-satisfying item in `docs/todos/later.md` — bring
it forward.

## What we want

- A `Stone` entity stored as `$DATA_DIR/stones/<slug>.md`, mirroring
  the shape of `Owner` (file-per-entity, frontmatter-only).
- `SharpeningSession.stones: string[]` — zero or more stone IDs used
  in a session. Order matters (it's a progression: 400 → 1000 → 5000).
- `/stones` list page (card grid or list, count of sessions referencing
  each stone, sort by most-used).
- `/stones/<id>` detail page: stone properties, a session timeline
  showing every time this stone was used and on which knife.
- Full CRUD via `/api/stones` and `/api/stones/[id]`, same conventions
  as `/api/owners` (ADR-0006).

## Fields

Minimal v1 — only what a hobbyist actually tracks:

- `id` — slug, derived from name if not supplied (same `slugify()` as
  owners).
- `name` — free-form ("Shapton Pro 2000", "King 1000").
- `grit` — number. Required; this is the defining property.
- `type` — free-form ("waterstone", "diamond plate", "ceramic", "strop").
  Optional.
- `notes` — free-form markdown body, for soak time, dishing
  observations, "needs flattening" reminders.
- `createdAt` / `updatedAt` — same as other entities.

Deliberately *not* in v1: wear estimates, flattening log, vendor link,
purchase date. Add when you actually want them; don't speculate.

## Referential rules

- `session.stones[]` is a foreign key list. Creating a session that
  references an unknown stone ID → 400, same shape as the existing
  unknown-`ownerId` rejection on knife create.
- Deleting a stone that's still referenced by any session → 409. Don't
  cascade. (Mirror the owner-with-knives rule.)
- Stones are optional on a session. Pre-existing sessions have no
  `stones` field; that stays valid.

## Open questions

- **Grit type.** Just a number, no scale qualifier (JIS vs FEPA vs ANSI).
  At single-user / hobbyist scale, you know which scale you mean.
  Document the default scale in `docs/data-model.md` and move on.
- **Ordering in `session.stones`.** Preserve array order — it's the
  progression. Don't sort it for display.
- **Where to show it on the knife page.** Each session row gains a
  small "stones used" line: `400 → 1000 → 5000` as chips, each linking
  to `/stones/<id>`.
- **Flattening tracking.** Tempting to add a "last flattened" date on
  the stone. Hold off; once you've used the feature for a month you'll
  know whether you want a structured field or just free-form notes.

## Notes for whoever picks this up

- ADR-0004 (storage seam) applies: implement everything via the
  `Storage` interface; don't reach into the markdown layer from routes.
- ADR-0006 (API-only CRUD) applies: writes go through `/api/stones*`,
  not Server Actions. UI is read-only for now.
- Update `docs/data-model.md` with the Stone section and the
  `session.stones` field — this is a non-additive schema change in
  spirit (sessions gain a new optional field), so document the
  invariant.
- Add an ADR only if the design genuinely diverges from how `Owner`
  works. If stones are "just another Owner-shaped entity," no ADR
  needed; the precedent in ADR-0004 covers it.
- `/stats` (see [[stats]]) should pick up stones once they exist —
  total uses per stone, average sessions between mentions of the same
  stone (rough flattening cadence proxy).
