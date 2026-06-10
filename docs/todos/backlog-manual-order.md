---
filetype: todo
status: done
completedOn: 2026-06-10
---

# Manual ordering of the backlog

> **Done.** Implemented 2026-06-10. Optional `backlogPosition?: number`
> on `Knife` (`src/lib/storage/types.ts`). `/backlog` defaults to a
> "Manual order" sort with `@dnd-kit`-powered drag-and-drop on the
> card grid; the drop handler posts `{ ids }` to
> `POST /api/backlog/reorder`, which rewrites positions as `1, 2, 3, …`.
> Optimistic local update + revert + toast on failure. The grip handle
> is hidden in oldest/newest/owner sorts and while a search/owner
> filter is active (the visual order would no longer match storage).
> Flagging a knife into the backlog auto-appends it at the end via
> `nextBacklogPosition` (used by both `POST /api/knives` and
> `PATCH /api/knives/{id}`); knives with `backlog: true` and no
> position are auto-appended on read by `sortByPosition` in
> `src/lib/backlog.ts`. The session-add handler and the PATCH handler
> both clear `backlogPosition` whenever `backlog` clears.
> `PATCH /api/knives/{id}` accepts `backlogPosition: number | null`
> (null clears explicitly). `docs/data-model.md` and `docs/api.md`
> updated. ADR-0006 still holds — the drop fires another API call,
> not a Server Action.

The current `/backlog` page has computed sorts (oldest first, newest
first, owner A–Z) — useful, but not the *actual* queue order. When
three knives are sitting on the bench, the order they get sharpened
in isn't really by `createdAt`; it's whatever you decide. This todo
adds manual ordering so the backlog reflects intent, not metadata.

See [[backlog]] for the underlying flag this builds on.

## What we want

- A persisted "position in queue" for each knife with `backlog ===
  true`. Knives not in the backlog have no position.
- A drag-and-drop reorder on `/backlog` — grab the card, drop it
  where it should go, position persists.
- A default "Manual order" sort on `/backlog` that respects the
  positions. The existing oldest/newest/owner sorts stay as
  alternatives; picking one of them just shows the list a different
  way without changing the stored order.
- When a knife leaves the backlog (auto-clear on first session, or
  manual `PATCH {backlog: false}`), its position is cleared too.
  The remaining positions stay valid without renumbering.

## Storage shape

Two reasonable approaches; lean toward (A):

- **(A) Float position on the knife.** `backlogPosition?: number` on
  `Knife`. Inserting between two knives sets the new position to the
  midpoint of the neighbours' positions. Trivial array reorders
  become single-field updates; no global renumbering. The float
  drifts toward unrepresentable precision after thousands of
  reorders, which won't happen here — but a one-shot "renumber to
  integers 1, 2, 3…" maintenance endpoint is cheap to add if needed.
- **(B) Ordered array of IDs on disk.** A `data/backlog.md` (or
  `.json`) holds the ordered list. Reorders are O(1) for the list
  but require keeping the list and the per-knife flag in sync.
  Worse: it's a parallel source of truth outside the Knife file,
  which complicates manual editing per the docs/data-model.md
  story.

Pick (A). One file is still the source of truth per knife.

## API

- `PATCH /api/knives/{id}` accepts `backlogPosition: number | null`.
  Setting `backlog: false` (or auto-clear on session) also clears
  `backlogPosition`.
- **Optional convenience endpoint** `POST /api/backlog/reorder` with
  body `{ ids: string[] }` — accepts the full ordered list of backlog
  IDs and rewrites positions as `1, 2, 3, …`. Simpler for the UI than
  computing midpoints client-side, and bakes in renumbering for free.
  The drag-and-drop component fires this on drop end. Lean: ship the
  convenience endpoint; UI never sees floats.

## UI

- Use [`@dnd-kit/core`](https://dndkit.com) (or `react-aria`'s
  drag-and-drop hooks if shadcn ends up shipping a wrapper) — pure
  React, keyboard-accessible. Avoid HTML5 drag-and-drop directly;
  it's a swamp.
- Drag handle on each card (a small `GripVertical` icon, top-right).
  Whole-card drag is tempting but conflicts with the existing card
  click → detail page.
- Drop fires `POST /api/backlog/reorder` with the new ID order;
  optimistically reorder the local state; revert + toast on failure.
- The "Manual order" option becomes the default sort and is the only
  view that actually shows the drag handle. Switching to oldest /
  newest / owner disables drag (the visual order no longer matches
  storage).

## Open questions

- **Per-owner queues?** When you have 5 knives from Guido and 2 from
  Jan, do you actually want to interleave them, or do you sharpen
  per-owner in batches anyway? If it's always per-owner batches,
  grouping by owner in the manual view (and ordering *within*
  owner) might be more natural than a flat list. Lean **flat list**
  for v1 — simpler, can always group later.
- **Position values when bulk-flagging?** If three knives get
  flagged in rapid succession, what positions do they get? Lean:
  append in flag order — the POST/PATCH handler picks
  `max(existing) + 1`. The user can drag them around afterwards.
- **What if two clients drag-reorder concurrently?** Single user, so
  ignore. Last write wins.
- **Render order when positions are missing?** If a knife has
  `backlog: true` but no `backlogPosition` (e.g. flagged via curl
  without the field), surface it at the end of the list with a
  visual hint that it's unsorted. Or just auto-append on read —
  cheaper, fewer special cases. Lean auto-append.

## Notes for whoever picks this up

- Additive schema change: `backlogPosition: z.number().optional()`
  on `KnifeSchema`. No migration needed.
- The session-add handler in
  `src/app/api/knives/[id]/sessions/route.ts` already force-clears
  `backlog: false`; extend it to also clear `backlogPosition`.
- Same in the PATCH handler when `backlog` is set to `false`.
- Extend `src/lib/backlog.ts` with a `sortByPosition(knives:
  Knife[]): Knife[]` helper — same shape as the existing
  `backlogList`.
- Update `docs/data-model.md` (new optional field) and
  `docs/api.md` (PATCH accepts the field; document the
  `/api/backlog/reorder` convenience endpoint if shipped).
- ADR-0006 still applies — the drag-end POST is just another API
  call; no Server Actions.
- See [[backlog]] for the underlying flag and [[session-rating]]
  for the additive-schema-field analogue.
