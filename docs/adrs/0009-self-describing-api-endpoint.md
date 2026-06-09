---
filetype: adr
id: "0009"
title: Expose a self-describing API endpoint for LLM clients
status: accepted
date: 2026-06-09
---

# Context

ADR-0006 made `/api/*` the public surface — Claude, curl, and any future
script hit the same endpoints. In practice, an LLM client (Claude in
particular) needs to learn that surface before it can use it. Today the
only way is to read `docs/api.md` from the repo, which assumes the model
has filesystem access. From a deployed instance with just the URL and a
bearer token, the API is opaque.

`/llms.txt` is the emerging convention for "machine-readable docs for
LLMs" — a single document at a well-known path that describes a site's
capabilities in markdown.

# Decision

- Expose `GET /api/docs` returning `text/markdown` with the full API
  reference: endpoint table, request/response schemas, and 2–3 worked
  curl examples per resource. Same auth as the rest of `/api/*` (bearer
  token or browser session).
- Generate the **schema portion** from the Zod definitions in
  `src/lib/storage/types.ts` so that it cannot drift from the runtime
  validators. Endpoint descriptions and examples are hand-written.
- Mirror at `GET /llms.txt` as a public, unauthenticated alias of the
  same content (with the auth section explaining how to obtain a token).
  An LLM discovering the deployment from just the URL can fetch this.
- **Every new endpoint added under `/api/*` must update the docs
  endpoint in the same change.** Reviewers should reject PRs that add
  a route without updating `/api/docs`. This is the operative discipline
  the ADR establishes; the implementation is just the vehicle.

# Consequences

- An LLM client with the URL + token can self-serve: fetch `/api/docs`,
  learn the surface, then call it. No repo access required.
- The schema section can't lie about field shapes — it's generated.
- `docs/api.md` and the endpoint can diverge in their non-schema parts
  (descriptions, examples). Keep them in sync by treating the endpoint
  as the canonical source and `docs/api.md` as a copy generated from
  it (or by linking `docs/api.md` to the endpoint and stop maintaining
  both — TBD when the endpoint exists).
- `/llms.txt` leaks the API surface to anonymous clients. That's fine:
  the shape was always derivable by trying endpoints, and writes still
  require the token. If this ever feels wrong, drop the unauth alias
  and require auth.

# Alternatives considered

- **OpenAPI / Swagger.** Overkill for a single-user app and not
  obviously easier for an LLM to consume than markdown. Revisit if a
  non-LLM client ever needs typed bindings.
- **Auto-generate `docs/api.md` from the code and stop serving it as an
  endpoint.** Misses the point — the deployment without repo access
  still can't read it.
- **No self-docs endpoint, rely on the LLM having repo access.** Works
  today because the operator is the only user and always has the repo
  open. Falls apart the moment another LLM hits the deployment cold.

# How to apply

When you add a route under `src/app/api/**`:

1. Implement the route handler.
2. Update the `/api/docs` content (endpoint table row + examples).
3. If you added or changed a Zod schema in `src/lib/storage/types.ts`,
   the generated schema section picks it up automatically — no edit
   needed there.
4. Update `docs/api.md` to match, until the endpoint becomes canonical.
