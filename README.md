# Edgewise

A small Next.js app for tracking knives I've sharpened for friends and
coworkers. Single user, runs on my homelab Portainer instance, data lives
as markdown files on disk.

Not a SaaS. Not multi-tenant. Just a tool I built for myself.

## Quick start

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Set `APP_PASSWORD` and `API_TOKEN` in `.env.local` first — both are
required. See `.env.example`.

Other commands:

```bash
pnpm build        # production build
pnpm start        # serve the built app
pnpm lint         # eslint
```

## How it works

```
client (src/app/**)              browser ← UI, login via Auth.js
       │  fetch /api/...
       ▼
Route handlers (src/app/api/**)  validates with Zod
       │
       ▼
Storage interface                src/lib/storage/types.ts
       │
       ▼
MarkdownStorage                  $DATA_DIR/{knives,owners}/<slug>.md
```

The HTTP API is the only write path. The UI uses it, and so can `curl`,
scripts, or Claude — see `docs/api.md`.

## Auth, two ways

- **Browser:** single password (`APP_PASSWORD`) via Auth.js Credentials,
  JWT session cookie.
- **API clients:** `Authorization: Bearer $API_TOKEN`.

Both live in `src/proxy.ts`.

## Deployment

Multi-stage `Dockerfile`, `output: "standalone"`, runs as a non-root user,
bind-mounts `/data`. `docker-compose.yml` is shaped for Portainer with
Traefik labels. Put it behind a reverse proxy that terminates TLS.

```bash
docker build -t edgewise:local .
```

See `docs/deployment.md`.

## Docs

- [`docs/architecture.md`](docs/architecture.md) — layers and why the
  storage interface exists.
- [`docs/data-model.md`](docs/data-model.md) — frontmatter fields, file
  layout, referential rules.
- [`docs/api.md`](docs/api.md) — endpoint reference and curl examples.
- [`docs/deployment.md`](docs/deployment.md) — Docker, Portainer, reverse
  proxy notes.
- [`docs/adrs/`](docs/adrs/) — accepted design decisions, one per file.
- [`docs/todos/`](docs/todos/) — what's on deck.

## Stack

Next.js 16 (App Router) · React 19 · Auth.js v5 · shadcn/ui · Tailwind v4
· Zod · markdown-on-disk storage.
