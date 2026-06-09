---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Sharpening diary — chronological global session log

> **Done.** Implemented 2026-06-09. `/diary` renders every session
> across all knives, grouped by month newest-first, each row linking
> to the knife and owner pages. Same data via `GET /api/diary`.
> Compute lives in `src/lib/diary.ts` (option 1 from the open
> questions — denormalized server-side). `NotebookPen` icon in the
> nav. Docs and the self-docs endpoint updated per ADR-0009.

Today, sessions only show up *inside* a knife: timeline on the detail
page, history list on the card. There's no way to ask "what did I do
in March?" without opening every knife. Add a single global,
chronological log of every session across the corpus — a sharpening
diary. Borrowed from Letterboxd's Diary view; same idea applies
beautifully to the bench.

## What we want

- `/diary` page (probably linked from the nav next to `/stats`).
- One row per session, newest first, infinite scroll or paginated
  blocks by month.
- Each row shows: date, knife (linked), owner (linked), angle, rating
  (if any), the session's notes, and a small cover thumb.
- Group headers by month: `MAR 2026`, then the sessions for that
  month, then `FEB 2026`, etc. — same monospace-uppercase style as
  existing section labels.
- A year picker / month jump at the top for scrubbing back without
  endless scrolling.
- Same data via `GET /api/diary` (or `GET /api/sessions`) so Claude
  and scripts can ask "show me everything in the last month".

## What it's good for

- **"What did I do this week?"** Single answer, not 17 detail pages.
- **Pattern noticing** — "I keep sharpening Guido's stuff in winter".
  Stats has aggregates; the diary has raw narrative.
- **Cross-knife notes** — discover that a comment from one session
  ("burr won't release") matches another from three months ago on a
  different knife.

## Open questions

- **Endpoint shape.** Two options:
  1. `GET /api/diary` returns an array of `{ date, knifeId, knifeName,
     ownerId, ownerName, angle, rating?, notes, coverFilename? }`
     denormalized, ready to render.
  2. `GET /api/sessions` returns just the sessions, leaving the
     client to join against `/api/knives` and `/api/owners`. Cheaper
     server, more roundtrips on cold loads.
  Lean (1) — at this corpus size the denormalization is trivial,
  and the diary page becomes a single fetch. Compute in
  `src/lib/diary.ts`, share with the page like `src/lib/stats.ts`
  does (ADR-0006-style API-first pattern).
- **Pagination vs. dump.** With ~14 sessions today, "just dump
  everything" is fine. At some point an infinite-scroll cursor will
  matter; punt until session count outgrows a single fetch.
- **Per-day grouping?** Optional. Letterboxd does per-day rows; for
  sharpening one day usually has one session, so per-day grouping
  would add visual noise. Skip; if a day has multiple sessions the
  rows just stack.
- **Drill-down to the knife.** The session row links to the knife
  detail page. Should it deep-link to the specific session? Nice-to-
  have; needs the session-edit todo's id scheme to land first
  ([[session-edit]]).

## Notes for whoever picks this up

- Compute lives in `src/lib/diary.ts`, mirrors `src/lib/stats.ts` —
  pure function taking `Knife[]` + `Owner[]` and producing the
  denormalized diary entries. Sort by date desc, tiebreak by knife
  name.
- ADR-0006 still applies — `/diary` page fetches via `api.getDiary()`
  added to `src/lib/api-client.ts`, never touches `getStorage()`.
- ADR-0009 self-docs: update `/api/docs` and `docs/api.md` with the
  new endpoint.
- Session rating ([[session-rating]]) already lands, so render stars
  in the row.
- `/stats` ([[stats]]) and `/diary` complement each other — stats is
  aggregated, diary is narrative. Don't merge them.
- The "raw activity log via the API" half of this lets you ask
  Claude: "show me every session from Lukas in 2025" and have it
  hit `/api/diary?from=2025-01-01&to=2025-12-31&ownerId=lukas-weger`
  (or just filter client-side from the dump). Decide on query params
  at implementation time based on whether the corpus has grown.
