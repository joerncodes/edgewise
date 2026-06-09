---
filetype: todo
status: done
completedOn: 2026-06-09
---

# First UI CRUD — toggle "backlog" from the knife detail page

> **Done.** Implemented 2026-06-09 in
> `src/app/knives/[id]/page.tsx`. The detail page was already a
> `"use client"` component, so no extraction was needed — added a
> `toggleBacklog` handler that calls `api.updateKnife(id, { backlog
> })`, swaps the returned knife into local state (no
> `router.refresh()` needed), and surfaces errors via `sonner`.
> Button sits inline in the `h1` next to the existing "In backlog"
> badge, label flips between "Add to backlog" / "Remove from
> backlog". This is the precedent: client component → `api.*` →
> local state update → toast on error. No Server Actions, ADR-0006
> still holds.

This is the **first UI write flow** in the app. ADR-0006 left the door
open ("UI write flows can be added later without changing the contract")
and this is that door opening. Pick the smallest possible action — the
backlog flag — so the pattern lands before any heavier form work.

## What we want

- A button on `src/app/knives/[id]/page.tsx` that toggles
  `knife.backlog`.
  - When `backlog !== true`: button reads "Add to backlog".
  - When `backlog === true`: button reads "Remove from backlog"
    (sits next to the existing "In backlog" badge at line 78).
- Clicking it calls `api.updateKnife(id, { backlog: !current })`
  via `src/lib/api-client.ts` (already exists, line 29). No new
  endpoint, no Server Action. ADR-0006 still holds: the UI hits
  `/api/*`, full stop.
- After the PATCH returns, refresh the page data so the badge and
  button label flip. `router.refresh()` is fine for v1 — this page
  is a Server Component today, so we'll need to extract the toggle
  into a small `"use client"` component that takes
  `{ id, backlog }` as props.

## Open questions

- **Optimistic update or wait-for-response?** Wait-for-response for
  v1 — one round trip, no flicker reasoning needed, and the failure
  case (toast + revert) is annoying to get right. Revisit if it
  feels sluggish.
- **Where does the button live visually?** Two candidates:
  1. Inline next to the name / "In backlog" badge in the header.
  2. In a small actions row under the header (future home for
     "edit", "delete", etc.).
  Lean (1) for v1 since it's the only action; promote to (2) once a
  second write action lands.
- **Error handling.** If the PATCH 4xx/5xx's, surface it — a toast
  via `sonner` (already a dep) is enough. Don't swallow.
- **Auth.** The browser path already carries the Auth.js session
  cookie, so the existing `/api/knives/[id]` PATCH handler accepts
  it without changes. No new auth work.

## Notes for whoever picks this up

- This is precedent. Whatever pattern lands here ("client component
  calls `api.*`, then `router.refresh()`, toast on error") will get
  copy-pasted for every UI write that follows ([[session-edit]],
  knife create, owner create, etc.). Pick the shape deliberately.
- Don't introduce Server Actions as a parallel write path — that's
  exactly what ADR-0006 ruled out.
- The PATCH endpoint and `updateKnife` client already exist; the
  whole change should be one small client component plus wiring it
  into the detail page. No schema, no API, no docs changes.
- Once this lands, mention it in ADR-0006's consequences (or
  supersede it with a new ADR if the policy shifts) so the
  "read-only UI" claim stays accurate.
