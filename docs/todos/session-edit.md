---
filetype: todo
status: open
---

# Edit and delete individual sessions

Today, sessions are append-only via `POST /api/knives/[id]/sessions`. To
fix a typo in a session's notes or correct a wrong angle, you have to
hand-edit the markdown file. Promote this to a first-class API
operation so the bench workflow stays inside the app.

## What we want

- `PATCH /api/knives/[id]/sessions/[date]` — partial update of a single
  session's `angle` and/or `notes`. Date stays the primary key; if the
  date itself is wrong, delete and re-add.
- `DELETE /api/knives/[id]/sessions/[date]` — remove a single session
  from a knife.
- Same Zod validation as create (angle 1–45, notes optional, etc.).
- UI stays read-only for now (per ADR-0006). This is API-first; the
  knife detail page can grow an "edit" affordance later.

## Open questions

- **Date collisions.** Two sessions on the same date for the same knife
  is already legal today (frontmatter is a list). If we key by date,
  PATCH/DELETE become ambiguous. Two options:
  1. Reject duplicate dates on create going forward, and treat the date
     as the unique key. Cleanest; existing data probably doesn't
     collide.
  2. Add an internal `sessionId` (slug from date + index, or a short
     ulid) and key by that. More robust, more churn on the on-disk
     shape — would need a data-model note.
  Probably (1) for v1. Verify by scanning existing data first.
- **PATCH semantics.** Standard partial-update: omitted fields stay,
  `null` clears (where the field is optional, i.e. `notes`). Don't
  invent a different convention.
- **404 vs 409.** Missing knife → 404. Missing session on an existing
  knife → 404. Use the helpers in `src/lib/http.ts`.
- **URL shape.** `/api/knives/[id]/sessions/[date]` reads cleanly and
  matches the existing nested-resource pattern (`.../images/[name]`).
  Date format in the URL: `YYYY-MM-DD`, same as on disk.

## Notes for whoever picks this up

- Saves rewrite the whole file — see CLAUDE.md. PATCH still serializes
  the full knife; nothing partial at the storage layer.
- Update `docs/api.md` with both endpoints and curl examples.
- Update `docs/data-model.md` if option (1) above lands (uniqueness
  constraint on session date per knife).
- ADR-0007 (per-session angle) still applies; this doesn't change that
  shape, it just exposes mutation.
- If at some point the UI grows an edit form, do it through these
  endpoints — don't add Server Actions as a parallel write path.
