---
filetype: todo
status: open
---

# Session add / edit / delete UI

The API for session mutation has been there since
[[DONE-session-edit]]: `POST /sessions`, `PATCH /sessions/{date}`,
`DELETE /sessions/{date}`. The detail page renders the session
timeline but has no buttons. Wire the form so the bench workflow
("just sharpened this; here's the angle, the stones, the rating")
lives inside the app.

## What we want

- "Add session" button at the top of the sessions timeline on
  `/knives/{id}`. Opens an inline form with: date (default today),
  angle (number, 1–45), abrasive multi-select with progression
  order, rating (star input, optional), notes (textarea).
- Save → `api.addSession(id, body)` → refetch knife → close form
  + toast. Adding a session auto-clears `backlog` (server already
  does this); the UI should reflect that immediately.
- Each session row in the timeline grows two icon buttons:
  pencil (edit) and trash (delete). Pencil → inline edit form
  pre-populated; Save → `PATCH`. Trash → `AlertDialog` → `DELETE`.
- After edit/delete, refetch and re-render in place.

## Open questions

- **Abrasive selector.** The progression is *ordered* (coarse →
  fine → strop). UI options:
  1. Multi-select dropdown + reorderable chip list below it.
  2. A series of single-select rows with "+ add step" — explicit
     about the progression being a list.
  Lean (1) — the dnd primitives (`@dnd-kit`) are already in the
  bundle from backlog/table-reorder, reuse them.
- **Abrasive list filter.** Source = `GET /api/abrasives`, but
  surfaced by grit ascending — that's how you'd pick a
  progression. A strop's "effective grit" already follows this
  rule per [[DONE-strops]].
- **Rating input.** Existing `Stars` component renders 1–5 with
  half-step display; need an interactive variant that handles
  click + keyboard (left/right arrow) and a "no rating" state.
  Pre-existing sessions can leave it blank.
- **Date collisions.** API rejects two sessions on the same date
  for the same knife (409). The form should pre-validate by
  scanning loaded sessions and disable the date if it'd collide,
  with an inline hint pointing to the existing one (Edit it
  instead).
- **Auto-fill the angle.** Default to the last session's `angle`
  if one exists — re-profiling is rare, touch-ups inherit the
  angle.
- **Notes default focus.** After picking abrasives + angle, the
  notes textarea is where eyes go. Auto-focus it once the
  required fields are filled? Probably not — too clever.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — the timeline section
  (`sortedSessions.map(...)`) is where edit/delete buttons land,
  and the "Add session" form sits above it.
- **`src/lib/api-client.ts`** — `addSession`, `editSession`,
  `deleteSession` already exist; no API changes needed.
- **`src/components/stars.tsx`** — extend or duplicate for input
  mode.
- **`src/lib/abrasives.ts`** — helpers for sorting abrasives by
  grit; the form reuses them.
- **`src/app/knives/[id]/page.tsx` `SessionAbrasives`** — already
  renders the abrasive chip pattern (grit + strop compound); the
  selector can mirror it.

## Out of scope

- Editing the date. The date is the primary key. To "change the
  date," delete and re-add (the form makes this one extra click).
- Per-step durations or pressures. The data model doesn't carry
  them and adding new session fields is a separate decision.
- A "quick session" inline action from the homepage card. Nice
  in theory; might be confusing in practice. Defer until the
  detail-page flow has been used a few times.

## Related

- [[DONE-session-edit]] — the API surface this UI sits on.
- [[ui-crud-foundation]] — pattern source for the inline form
  and AlertDialog.
- [[ui-knife-edit-delete]] — neighbouring concern on the same
  detail page.
- ADR-0007 — per-session angle, still the reason `angle` lives
  here and not on the knife.
