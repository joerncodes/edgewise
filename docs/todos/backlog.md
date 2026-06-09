---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Backlog — explicit "waiting to be sharpened" flag

> **Done.** Implemented 2026-06-09. Optional `backlog: boolean` on
> `Knife` (`src/lib/storage/types.ts`), settable via `PATCH /api/
> knives/{id}`. The first `POST .../sessions` after flagging clears
> it automatically. `/backlog` page (`src/app/backlog/page.tsx`) with
> oldest-first/newest/owner sort + search + owner filter. Homepage
> callout when N > 0. "In backlog" badge on the knife detail page.
> Derived helpers in `src/lib/backlog.ts`. No `/api/backlog`
> endpoint — pages filter client-side. `docs/data-model.md` and
> `docs/api.md` updated. Nav link added (Inbox icon, between Library
> and Stats); count badge deferred per the open question. Manual
> ordering of the backlog list is a separate todo —
> [[backlog-manual-order]].

A knife that's been dropped off but not sharpened yet should be
visible at a glance. This is *not* derived from `sessions.length`
(a knife can come back for a re-sharpen and sit in the queue again);
it's a manual flag the owner sets when the knife shows up, and clears
when it goes home.

## What we want

- **New optional field** on `Knife`: `backlog: boolean` (default
  `false`/absent means not in the backlog). Plain bool, no nuance —
  just "is it sitting on the bench right now".
- **Manual toggle.** Settable via the API (`PATCH /api/knives/{id}`
  with `{backlog: true|false}`). No UI toggle yet — same ADR-0006
  spirit as everything else; the owner can flip it via curl / Claude
  / the API surface.
- **Dedicated `/backlog` page.** Lists every knife with `backlog ===
  true`, using the same card layout as the home page. Replaces the
  "last sharpened" line with "added <relative time>" so newly-dropped-
  off knives without sessions don't render an empty line.
- **Homepage feature.** A compact callout at the top of `/` —
  "*N knives in the backlog →*", linking to `/backlog`, only rendered
  when N > 0. Don't bury it; the point is to see it on open.
- **Sort** on `/backlog`:
  - Oldest first (default — FIFO, fairness)
  - Newest first
  - Owner A–Z (batch by owner when they show up)
  Reuse the `Select` pattern from `src/app/page.tsx`.

## Open questions

- **Auto-clear on sharpening?** When a session is added to a knife
  that's `backlog: true`, should the field flip back to `false`
  automatically? Lean **yes** — easy to forget otherwise, and the
  semantics ("waiting to be sharpened") are obviously falsified by
  the act of sharpening. Implement in the `POST /api/knives/{id}/
  sessions` handler.
- **Sort field for "oldest first".** Use `updatedAt` (when the flag
  was last flipped, approximately) or `createdAt` (when the knife
  first appeared)? `updatedAt` is closer to "how long has this been
  sitting" but it'll churn on any edit. Lean `createdAt` for v1 —
  good enough and stable. Revisit if it gets misleading.
- **Empty state.** When backlog is empty, render an `EmptyState`
  ("Inbox zero — nothing waiting"); homepage callout hides entirely.
- **Should it show on the knife detail page?** A small "in backlog"
  badge next to the name when `backlog === true`. Cheap, useful.
- **Nav badge.** A "Backlog (N)" link in the footer/nav would be
  nice but requires a global fetch on every page. Defer unless it
  becomes annoying.

## Notes for whoever picks this up

- Schema change in `src/lib/storage/types.ts`: `backlog:
  z.boolean().optional()` on `KnifeSchema`. Additive — no migration
  needed; absent === false.
- Update `docs/data-model.md` with the new field (semantics: "true
  while the knife is waiting on the bench; cleared manually or on
  first session after being flagged").
- Update `docs/api.md` and the `/api/docs` endpoint (ADR-0009) to
  mention the field on `PATCH /api/knives/{id}`. Zod-generated
  schema picks it up automatically.
- Derived helpers: `src/lib/backlog.ts` exporting `inBacklog(k:
  Knife): boolean` and `backlogList(knives: Knife[]): Knife[]`.
  Same pattern as [[janitor]]. Optional `GET /api/backlog`
  endpoint if external clients want it; the homepage callout and
  `/backlog` page can just call `api.listKnives()` and filter.
- ADR-0006 still applies — writes via `/api/*`. If a "mark as
  backlog / mark as done" button lands later, it goes through the
  PATCH endpoint, not Server Actions.
- See [[janitor]] for the derived-view analogue and [[session-rating]]
  for the additive-schema-field analogue.
