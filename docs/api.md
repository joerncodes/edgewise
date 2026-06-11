# API

The HTTP API is the only way data is read or written. The web UI uses the
same endpoints; external scripts (and Claude) can hit it directly.

## Auth

Send the API token as a Bearer header:

```
Authorization: Bearer $API_TOKEN
```

Browsers that have signed in via `/login` are authenticated by cookie and
don't need the header.

Without either, the server responds:

```json
{"error":"unauthorized"}
```
with status `401`.

## Conventions

- All bodies are JSON. Errors have shape `{"error": "...", "details"?: ...}`.
- Validation errors return `400` with Zod's flattened issues in `details`.
- IDs are slugs derived from `name` unless you supply `id` on create.
- All timestamps are server-set ISO strings.

## Endpoints

### Knives

| Method | Path                          | Body                | Returns                  |
|--------|-------------------------------|---------------------|--------------------------|
| GET    | `/api/knives`                 | —                   | `{ knives: Knife[] }`    |
| POST   | `/api/knives`                 | `KnifeInput`        | `{ knife }` (201)        |
| GET    | `/api/knives/{id}`            | —                   | `{ knife }`              |
| PATCH  | `/api/knives/{id}`            | partial `KnifeInput`| `{ knife }`              |
| DELETE | `/api/knives/{id}`            | —                   | 204                      |
| POST   | `/api/knives/{id}/sessions`   | `Session`           | `{ knife }` (201)        |
| POST   | `/api/knives/{id}/images`     | multipart           | `{ knife }` (201)        |
| GET    | `/api/knives/{id}/images/{filename}` | —            | image bytes              |
| DELETE | `/api/knives/{id}/images/{filename}` | —            | `{ knife }`              |

`PATCH /api/knives/{id}` accepts `backlogPosition: number | null` to set
or clear the manual queue position. `null` clears it explicitly. Flagging
a knife into the backlog without a position auto-appends it (max + 1);
clearing `backlog` (manually or via a session) clears the position too.

### Backlog

| Method | Path                      | Body              | Returns           |
|--------|---------------------------|-------------------|-------------------|
| POST   | `/api/backlog/reorder`    | `{ ids: string[] }` | `{ updated: number }` |

Rewrites `backlogPosition` for the given IDs as `1, 2, 3, …` in order.
Every ID must be a knife with `backlog: true`; duplicates are rejected.
This is the endpoint the drag-and-drop UI fires on drop, but it's plain
enough to call from curl too.

### Owners

| Method | Path                | Body          | Returns                |
|--------|---------------------|---------------|------------------------|
| GET    | `/api/owners`       | —             | `{ owners: Owner[] }`  |
| POST   | `/api/owners`       | `OwnerInput`  | `{ owner }` (201)      |
| GET    | `/api/owners/{id}`  | —             | `{ owner }`            |
| PATCH  | `/api/owners/{id}`  | partial input | `{ owner }`            |
| DELETE | `/api/owners/{id}`  | —             | 204 (409 if in use)    |

### Steels

| Method | Path                | Body          | Returns                |
|--------|---------------------|---------------|------------------------|
| GET    | `/api/steels`       | —             | `{ steels: Steel[] }`  |
| POST   | `/api/steels`       | `SteelInput`  | `{ steel }` (201)      |
| GET    | `/api/steels/{id}`  | —             | `{ steel }`            |
| PATCH  | `/api/steels/{id}`  | partial input | `{ steel }`            |
| DELETE | `/api/steels/{id}`  | —             | 204 (409 if in use)    |

`Knife.steel` is a soft FK: it should equal `slugify(Steel.id)` when a
record exists, but the API does not reject unknown strings. Steel
records can carry persistent markdown notes (rust care, sharpening
behaviour, etc.) that live independently of any knife.

### Diary

| Method | Path          | Body | Returns                                |
|--------|---------------|------|----------------------------------------|
| GET    | `/api/diary`  | —    | denormalized session log grouped by month |

Every session across every knife, in one chronological stream. Shape
lives in `src/lib/diary.ts` (`Diary` interface). The matching UI is
`/diary`.

### Janitor

| Method | Path             | Query              | Returns                |
|--------|------------------|--------------------|------------------------|
| GET    | `/api/janitor`   | `?staleAfterDays`  | knives grouped by missing field |

Pure derived view: knives without a photo, without a steel, without
any sessions, etc. Shape lives in `src/lib/janitor.ts`. The matching
UI is `/janitor`. `staleAfterDays` (default 365) tunes the
"not sharpened in a long time" bucket.

### Stats

| Method | Path          | Body | Returns                            |
|--------|---------------|------|------------------------------------|
| GET    | `/api/stats`  | —    | aggregate stats JSON (see below)   |

Pure derived view — no persistent state. The shape lives in
`src/lib/stats.ts` (`Stats` interface) and includes totals, sessions
per month (24-month dense window), sessions per owner, top knives by
session count, steel and type mix, angle histogram, and longest gaps
since last sharpening.

### Self-describing docs

| Method | Path         | Body | Returns                          |
|--------|--------------|------|----------------------------------|
| GET    | `/api/docs`  | —    | this reference as `text/markdown`|
| GET    | `/llms.txt`  | —    | same content, unauthenticated    |

Both endpoints return the same document. The schema section is
generated from the Zod definitions in `src/lib/storage/types.ts`, so
it can't drift. See ADR-0009.

## Schemas

See `src/lib/storage/types.ts` for the Zod source of truth.

```ts
KnifeInput = {
  id?: string
  name: string
  ownerId: string
  manufacturer?: string
  steel?: string
  type?: string
  notes?: string
  backlog?: boolean   // true while waiting on the bench; auto-cleared on next session
  onLoan?: boolean    // true when physically here but not mine
  sessions?: Session[]
}

Session = {
  date: string    // YYYY-MM-DD
  angle: number   // 1..45 per side
  notes?: string
  rating?: number // subjective 1..5, free precision
}

OwnerInput = {
  id?: string
  name: string
  contact?: string
  notes?: string
}

SteelInput = {
  id?: string
  name: string
  composition?: string
  notes?: string   // markdown
}
```

## Examples

```bash
TOKEN=$API_TOKEN
BASE=http://localhost:3000

# Create an owner
curl -s -X POST $BASE/api/owners \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane Doe","contact":"jane@example.com"}'

# Create a knife
curl -s -X POST $BASE/api/knives \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Wüsthof Chef 8","ownerId":"jane-doe","steel":"X50CrMoV15","type":"chef"}'

# Record a sharpening (also auto-clears `backlog` if it was set)
curl -s -X POST $BASE/api/knives/wusthof-chef-8/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-06-09","angle":18,"notes":"Touch-up on 4000"}'

# Flag a knife as waiting on the bench (appears on /backlog)
curl -s -X PATCH $BASE/api/knives/wusthof-chef-8 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"backlog":true}'

# Mark a knife as on loan (here but not mine)
curl -s -X PATCH $BASE/api/knives/wusthof-chef-8 \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"onLoan":true}'

# List
curl -s $BASE/api/knives -H "Authorization: Bearer $TOKEN" | jq

# Upload an image (multipart)
curl -s -X POST $BASE/api/knives/guido-kleines-santoku/images \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./guido-kleines-santoku.png;type=image/png" \
  -F "caption=Santoku, after re-grinding the chip"
```
