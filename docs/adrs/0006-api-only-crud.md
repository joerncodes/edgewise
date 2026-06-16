---
filetype: adr
id: "0006"
title: All CRUD goes through the HTTP API; UI is read-only for now
status: superseded
supersededBy: "0013"
date: 2026-06-09
---

> **Superseded by [ADR-0013](0013-ui-write-flows-via-api.md).** The
> "API as the only write path" half of this decision stays — UI
> writes still go through `/api/*` via `src/lib/api-client.ts`, no
> Server Actions. What changed is the "UI is read-only" half: write
> flows are growing in the UI on top of the same contract. See
> ADR-0013.

# Context

The owner wants to drive create/update flows from Claude and ad-hoc scripts,
and wants a single contract to reason about. A separate UI form layer plus a
parallel API would duplicate validation and confuse the source of truth.

# Decision

- Every read and write the app supports is exposed as an HTTP endpoint under
  `/api/*`. Zod schemas validate input at the boundary.
- The UI (server and client) does **not** import `getStorage()` directly.
  It calls `/api/*` via `src/lib/api-client.ts`.
- The UI ships **read-only** for the initial version: lists, detail views,
  dashboard. Creating knives, owners, and sharpening sessions happens via
  the API. UI write flows can be added later without changing the contract.

# Consequences

- One auth boundary, one validation layer, one shape to document.
- The API surface is the public surface — Claude, curl, future mobile
  client, all hit the same endpoints.
- Initial UX is mildly inconvenient (no "+ New" buttons) but the owner
  prefers this trade-off for now.

# Alternatives considered

- **Server Actions for the UI + API for scripts.** Two write paths,
  diverging validation, harder to reason about.
- **Storage imported directly into Server Components.** Faster initial
  read, but external clients still need an API, so we'd build it anyway.
