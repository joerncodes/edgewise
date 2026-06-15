---
filetype: todo
status: done
---

# Backlog age coloring

The backlog tells you what's waiting but not how long it's been
waiting. A knife dropped off yesterday and one that's been sitting
on the bench for two months look identical. A subtle color cue
based on age would create gentle pressure to not let things rot.

## What we want

- On `/backlog`, tint each card (and table row) by how long ago
  the knife was added to the backlog:
  - <1 week: default / muted
  - 1–4 weeks: subtle warning tint (amber accent)
  - >4 weeks: stronger warning (red accent)
- Edge cues only — left border, badge, or pill — not full-card
  background. The backlog is read quickly; loud colors fight the
  cards' existing structure.
- Tooltip on the cue: "Added 18 days ago."

## Where to look

- **`src/components/knife-card.tsx`** — the backlog page renders
  cards in cards mode. Add a left-border accent class derived
  from age.
- **`src/components/knives-view.tsx`** — for table mode, either
  tint the row or add an `Age` indicator cell. The backlog
  variant already has an `added` column; could promote that to a
  colored "Waited" badge instead of plain "ago" text.
- **`src/lib/backlog.ts`** — small helper here, e.g.
  `backlogAgeBucket(knife, now)` returning `"fresh" | "warm" |
  "stale"`. Keep the buckets in one place so card + row stay in
  sync.

## Open questions

- **Anchor date.** `createdAt` works for knives created already
  in backlog (the common case), but is wrong if a knife sits
  around and gets flagged into backlog later. Strictly correct
  would need a `backloggedAt` timestamp set when `backlog`
  flips to `true`. Defer that until it actually matters — start
  with `createdAt` and a note that it might mis-report for
  re-flagged knives.
- **Per-owner expectations.** Some owners are fine waiting two
  months ("when you get to it"), others aren't. Out of scope
  for v1 — uniform thresholds are honest enough at single-user
  scale.
- **Color in dark mode.** Pick from existing palette (the
  `--steel` / `--brass` accent tokens, or a tuned amber/red
  pair) so it stays on-theme.

## Out of scope

- A `backloggedAt` field on the schema. Defer; current `createdAt`
  is close enough.
- Aging on `/` (all knives). The signal there is "overdue" via
  the `overdue` sort, not "waiting in queue."
- Email reminders / push notifications. Pure visual cue.

## Related

- [[DONE-backlog]] — the backlog itself.
- [[DONE-backlog-manual-order]] — the manual queue position is
  the user's own prioritization; age cue is the orthogonal
  "objective" signal.
- `src/lib/backlog.ts` — where the helper lives.
