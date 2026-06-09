# Architecture

Knoives is a single-user Next.js app for tracking knives sharpened for friends
and coworkers. It is intentionally small.

## Layers

```
┌──────────────────────────────┐
│  UI (App Router, client)     │  src/app/**, src/components/**
│   - All CRUD via fetch(/api) │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│  HTTP API (Route Handlers)   │  src/app/api/**
│   - Zod-validated JSON       │
│   - Auth via Auth.js cookie  │
│     or Bearer API_TOKEN      │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│  Storage interface           │  src/lib/storage/types.ts
│   - listKnives / getKnife /  │
│     saveKnife / deleteKnife  │
│   - same for owners          │
└──────────────┬───────────────┘
               │
┌──────────────▼───────────────┐
│  MarkdownStorage             │  src/lib/storage/markdown.ts
│   - one .md per entity       │
│   - YAML frontmatter + body  │
│   - reads from DATA_DIR      │
└──────────────────────────────┘
```

## Why the storage interface

`Storage` is the seam. Today only `MarkdownStorage` exists. To add SQLite,
Postgres, or anything else, implement the interface and switch `getStorage()`
in `src/lib/storage/index.ts`. No call site outside that file knows how data
is persisted.

## Auth model

Two parallel auth paths, both checked in middleware:

- **UI:** Auth.js v5 Credentials provider with a single hardcoded user. The
  password lives in `APP_PASSWORD`. Login at `/login` sets a JWT session
  cookie.
- **API:** `Authorization: Bearer <API_TOKEN>` header bypasses the session
  cookie. This is what Claude, curl, and scripts use.

If a request has neither, the middleware:
- redirects browsers to `/login` for non-API routes,
- returns 401 JSON for `/api/*`.

## Why all CRUD goes through the API

The UI never talks to `Storage` directly. Even the dashboard fetches `/api/...`.
This keeps a single surface for both the browser and external agents (Claude),
so the contract is one thing, documented in `docs/api.md`.

## Data flow for "record a sharpening"

1. User opens `/knives/<id>` (client component).
2. `useEffect` calls `api.getKnife(id)` → `GET /api/knives/<id>`.
3. Route handler calls `getStorage().getKnife(id)` → reads
   `${DATA_DIR}/knives/<id>.md`.
4. User fills the form, submits → `POST /api/knives/<id>/sessions`.
5. Handler appends the session, sorts by date, writes the whole file back.
6. Page calls `refresh()` and re-renders.

There is no partial update inside a markdown file — each save rewrites the
file. This is fine for a single-user homelab app and simplifies a lot.
