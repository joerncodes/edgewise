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

### Owners

| Method | Path                | Body          | Returns                |
|--------|---------------------|---------------|------------------------|
| GET    | `/api/owners`       | —             | `{ owners: Owner[] }`  |
| POST   | `/api/owners`       | `OwnerInput`  | `{ owner }` (201)      |
| GET    | `/api/owners/{id}`  | —             | `{ owner }`            |
| PATCH  | `/api/owners/{id}`  | partial input | `{ owner }`            |
| DELETE | `/api/owners/{id}`  | —             | 204 (409 if in use)    |

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
  sessions?: Session[]
}

Session = {
  date: string   // YYYY-MM-DD
  angle: number  // 1..45
  notes?: string
}

OwnerInput = {
  id?: string
  name: string
  contact?: string
  notes?: string
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

# Record a sharpening
curl -s -X POST $BASE/api/knives/wusthof-chef-8/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"date":"2026-06-09","angle":18,"notes":"Touch-up on 4000"}'

# List
curl -s $BASE/api/knives -H "Authorization: Bearer $TOKEN" | jq

# Upload an image (multipart)
curl -s -X POST $BASE/api/knives/guido-kleines-santoku/images \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./guido-kleines-santoku.png;type=image/png" \
  -F "caption=Santoku, after re-grinding the chip"
```
