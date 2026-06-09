# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-user Next.js app for tracking knives the owner has sharpened for
friends and coworkers. Lives on a homelab Portainer instance. The user is one
person.

Keep it small. This is not a SaaS — do not add multi-tenancy, role systems,
event sourcing, or other speculative scale.

## Commands

```bash
pnpm dev          # local dev server (Turbopack)
pnpm build        # production build
pnpm start        # serve the built app
pnpm lint         # eslint
docker build -t edgewise:local .
```

There is no test suite. If a change is risky enough to need one, propose it
explicitly rather than silently adding a framework.

## Architecture in one screen

```
client (src/app/**, "use client")
        │  fetch /api/...
        ▼
Route Handlers (src/app/api/**)
        │  Zod-validates input
        ▼
Storage interface (src/lib/storage/types.ts)
        │
        ▼
MarkdownStorage (src/lib/storage/markdown.ts)
        │
        ▼
$DATA_DIR/{knives,owners}/<slug>.md
```

Key invariants — break these and the rest stops making sense:

- **The UI does not import `getStorage()`.** All reads and writes go through
  `/api/*`. The fetch layer lives in `src/lib/api-client.ts`. This is what
  lets external clients (Claude, curl, scripts) hit the exact same surface.
- **The UI is read-only for now.** No create / edit / delete buttons.
  Writes happen via the API (see [ADR-0006](docs/adrs/0006-api-only-crud.md)).
  When the owner asks for UI write flows later, add them — but keep the API
  as the source of truth and don't introduce Server Actions as a parallel
  write path.
- **`Storage` is the seam.** Only `getStorage()` in `src/lib/storage/index.ts`
  knows which implementation is in use. To add SQLite/Postgres, implement
  `Storage` and swap there — do not branch on the implementation elsewhere.
- **Saves rewrite the whole file.** There is no partial frontmatter edit;
  `MarkdownStorage.saveKnife/saveOwner` serializes the full object. Fine for
  this scale; keep it that way.
- **Sessions carry their own angle.** A knife has many sharpening sessions;
  each session has its own `date`, `angle`, `notes`. Do not move `angle` up
  to the knife level — re-profiling at a different angle later is expected.
- **`ownerId` is a foreign key.** Creating a knife with an unknown `ownerId`
  is rejected. Deleting an owner that still has knives returns 409. Don't
  silently cascade.

## Auth has two paths

`src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`) runs Auth.js
v5 *and* checks for a Bearer header:

- Browsers: Auth.js Credentials provider, single env-var password
  (`APP_PASSWORD`). JWT session cookie.
- API clients: `Authorization: Bearer $API_TOKEN`. Bypasses the session.

When working on auth, change both paths together. The proxy file is the
only place that decides between them.

## Data on disk

`$DATA_DIR` defaults to `./data` in dev and `/data` in the container.
Format and frontmatter fields are documented in `docs/data-model.md` —
read it before changing the on-disk shape, because files written by previous
versions are the source of truth and there is no migration tooling.

If you change the Zod schema in a non-additive way, you owe a migration
note in `docs/data-model.md` and ideally a one-shot script.

## Deployment

Multi-stage Dockerfile, `output: "standalone"`, runs as non-root, binds
`/data`. `docker-compose.yml` is shaped for Portainer stack env vars. See
`docs/deployment.md`.

The app does not terminate TLS or run health probes; put it behind a reverse
proxy. `AUTH_URL` must be set to the public URL in production.

## Conventions worth knowing

- `slugify()` in `src/lib/storage/ids.ts` is how IDs are derived from names
  when the caller doesn't supply one. Filenames match IDs 1:1.
- Errors from route handlers go through helpers in `src/lib/http.ts`
  (`badRequest`, `notFound`, `conflict`, `fromZod`, `serverError`).
  Use these — don't hand-roll `NextResponse.json` for errors.
- shadcn/ui components live in `src/components/ui/`. Add new ones via
  `pnpm dlx shadcn@latest add <name>`.
- Next.js 16 App Router route handlers receive `params` as a Promise —
  note the `await params` pattern in `[id]/route.ts` files.

## Decision log

Significant design choices live as ADRs in `docs/adrs/`. Each file has
`filetype: adr` frontmatter. Index: `docs/adrs/README.md`.

When making a new significant decision (framework swap, new storage backend,
auth model change, public-API contract change), add a new ADR rather than
silently re-shaping the code. Don't edit accepted ADRs in place — mark them
`superseded` and point to the replacement.

## Docs map

- `docs/architecture.md` — layers, why the storage interface exists.
- `docs/data-model.md` — frontmatter fields, file layout, referential rules.
- `docs/api.md` — endpoint reference + curl examples.
- `docs/deployment.md` — Docker, Portainer stack, reverse proxy notes.
- `docs/adrs/*.md` — accepted decisions, one per file.
- `docs/todos/*.md` — things on deck (`initial.md`, `later.md`, `images.md`
  for the per-knife 0..n images feature). Edit these when picking up or
  finishing items, rather than scattering TODO comments through the code.
