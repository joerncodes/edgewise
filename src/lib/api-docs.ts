import { z } from "zod";
import {
  AbrasiveInputSchema,
  AbrasiveSchema,
  KnifeInputSchema,
  KnifeSchema,
  OwnerInputSchema,
  OwnerSchema,
  SteelInputSchema,
  SteelSchema,
  SharpeningSessionSchema,
  ImageRefSchema,
} from "@/lib/storage/types";

const SCHEMAS = {
  Knife: KnifeSchema,
  KnifeInput: KnifeInputSchema,
  Owner: OwnerSchema,
  OwnerInput: OwnerInputSchema,
  Steel: SteelSchema,
  SteelInput: SteelInputSchema,
  Abrasive: AbrasiveSchema,
  AbrasiveInput: AbrasiveInputSchema,
  SharpeningSession: SharpeningSessionSchema,
  ImageRef: ImageRefSchema,
} as const;

function renderSchemas(): string {
  return Object.entries(SCHEMAS)
    .map(([name, schema]) => {
      const jsonSchema = z.toJSONSchema(schema);
      return `### \`${name}\`\n\n\`\`\`json\n${JSON.stringify(jsonSchema, null, 2)}\n\`\`\``;
    })
    .join("\n\n");
}

// Hand-written. Auto-generation is reserved for the schema section — see
// ADR-0009. When you add or change an endpoint, update this string.
const ENDPOINTS = `\
| Method | Path                                  | Body / Params      | Returns                  |
|--------|---------------------------------------|--------------------|--------------------------|
| GET    | \`/api/knives\`                         | —                  | \`{ knives: Knife[] }\`    |
| POST   | \`/api/knives\`                         | \`KnifeInput\`       | \`{ knife }\` (201)        |
| GET    | \`/api/knives/{id}\`                    | —                  | \`{ knife }\`              |
| PATCH  | \`/api/knives/{id}\`                    | partial \`KnifeInput\` | \`{ knife }\`           |
| DELETE | \`/api/knives/{id}\`                    | —                  | 204                      |
| POST   | \`/api/knives/{id}/sessions\`           | \`SharpeningSession\` | \`{ knife }\` (201)       |
| POST   | \`/api/knives/{id}/images\`             | multipart (\`file\`, optional \`caption\`) | \`{ knife }\` (201) |
| GET    | \`/api/knives/{id}/images/{filename}\`  | —                  | image bytes              |
| DELETE | \`/api/knives/{id}/images/{filename}\`  | —                  | \`{ knife }\`              |
| GET    | \`/api/owners\`                         | —                  | \`{ owners: Owner[] }\`    |
| POST   | \`/api/owners\`                         | \`OwnerInput\`       | \`{ owner }\` (201)        |
| GET    | \`/api/owners/{id}\`                    | —                  | \`{ owner }\`              |
| PATCH  | \`/api/owners/{id}\`                    | partial \`OwnerInput\` | \`{ owner }\`           |
| DELETE | \`/api/owners/{id}\`                    | —                  | 204 (409 if in use)      |
| GET    | \`/api/steels\`                         | —                  | \`{ steels: Steel[] }\`    |
| POST   | \`/api/steels\`                         | \`SteelInput\`       | \`{ steel }\` (201)        |
| GET    | \`/api/steels/{id}\`                    | —                  | \`{ steel }\`              |
| PATCH  | \`/api/steels/{id}\`                    | partial \`SteelInput\` | \`{ steel }\`          |
| DELETE | \`/api/steels/{id}\`                    | —                  | 204 (409 if in use)      |
| GET    | \`/api/abrasives\`                      | —                  | \`{ abrasives: Abrasive[] }\` |
| POST   | \`/api/abrasives\`                      | \`AbrasiveInput\`    | \`{ abrasive }\` (201)     |
| GET    | \`/api/abrasives/{id}\`                 | —                  | \`{ abrasive }\`           |
| PATCH  | \`/api/abrasives/{id}\`                 | partial \`AbrasiveInput\` | \`{ abrasive }\`      |
| DELETE | \`/api/abrasives/{id}\`                 | —                  | 204 (409 if referenced)  |
| POST   | \`/api/abrasives/{id}/images\`          | multipart (\`file\`, optional \`caption\`) | \`{ abrasive }\` (201) |
| GET    | \`/api/abrasives/{id}/images/{filename}\` | \`?size=thumb\`    | image bytes              |
| DELETE | \`/api/abrasives/{id}/images/{filename}\` | —                | \`{ abrasive }\`           |
| GET    | \`/api/stats\`                          | —                  | aggregate stats (see below) |
| GET    | \`/api/diary\`                          | —                  | chronological session log (see below) |
| GET    | \`/api/janitor\`                        | \`?staleAfterDays\`  | knives missing fields (see below) |
| GET    | \`/api/facets\`                         | —                  | distinct categorical values + counts (see below) |
| GET    | \`/api/docs\`                           | —                  | this document (markdown) |
| GET    | \`/llms.txt\`                           | —                  | this document, unauth    |`;

const EXAMPLES = `\
\`\`\`bash
TOKEN=…          # bearer token, from API_TOKEN env on the server
BASE=https://edgewise.example

# Create an owner
curl -s -X POST $BASE/api/owners \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Jane Doe","contact":"jane@example.com"}'

# Create a knife (ownerId must already exist)
curl -s -X POST $BASE/api/knives \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Wüsthof Chef 8","ownerId":"jane-doe","steel":"X50CrMoV15","type":"chef"}'

# Record a sharpening session
curl -s -X POST $BASE/api/knives/wusthof-chef-8/sessions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"date":"2026-06-09","angle":18,"notes":"Touch-up on 4000","rating":4.5}'

# Upload an image (multipart)
curl -s -X POST $BASE/api/knives/wusthof-chef-8/images \\
  -H "Authorization: Bearer $TOKEN" \\
  -F "file=@./after.jpg;type=image/jpeg" \\
  -F "caption=After re-grinding the chip"

# Fetch this document
curl -s $BASE/api/docs -H "Authorization: Bearer $TOKEN"

# Add a steel (or backfill notes for a derived one)
curl -s -X POST $BASE/api/steels \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"80CrV2","composition":"0.8% C, 0.5% Cr, 0.15% V","notes":"High-carbon — wipe dry, oil occasionally."}'

# Add abrasives (stones and strops live in the same table), then
# record a session that walks coarse → fine and finishes on a strop
curl -s -X POST $BASE/api/abrasives \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Shapton Pro 1000","grit":1000,"type":"waterstone"}'
curl -s -X POST $BASE/api/abrasives \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"name":"Kangaroo strop","grit":60000,"type":"strop","compound":"chromium oxide 0.5 µm","substrate":"kangaroo leather"}'
curl -s -X POST $BASE/api/knives/wusthof-chef-8/sessions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H 'Content-Type: application/json' \\
  -d '{"date":"2026-06-10","angle":18,"abrasives":["shapton-pro-1000-1000","kangaroo-strop-60000"]}'

# Aggregate stats — sessions/month, per-owner counts, angle histogram, etc.
curl -s $BASE/api/stats -H "Authorization: Bearer $TOKEN" | jq

# Diary — every session ever, denormalized and grouped by month
curl -s $BASE/api/diary -H "Authorization: Bearer $TOKEN" | jq

# Janitor — knives missing fields (no photo, no steel, etc.) for backfill
curl -s $BASE/api/janitor -H "Authorization: Bearer $TOKEN" | jq

# Facets — distinct values + counts for every categorical attribute
curl -s $BASE/api/facets -H "Authorization: Bearer $TOKEN" | jq
\`\`\`

## Diary

\`GET /api/diary\` returns every sharpening session ever recorded,
denormalized and grouped by month. Same data is rendered at the
\`/diary\` page in the UI. Shape:

\`\`\`ts
type Diary = {
  totalSessions: number;
  months: {
    month: string; // YYYY-MM, newest first
    entries: {
      date: string; // YYYY-MM-DD
      knifeId: string;
      knifeName: string;
      ownerId: string;
      ownerName: string;
      angle: number;
      rating?: number;
      notes: string;
      coverFilename?: string;
    }[];
  }[];
  generatedAt: string;
};
\`\`\`

## Janitor

\`GET /api/janitor\` is the maintenance lens: knives grouped by which
field they're missing, so you can backfill in batches. Pure derived
view — no schema change. Optional query param \`?staleAfterDays=NNN\`
(default 365) tunes the "not sharpened in a long time" bucket.

\`\`\`ts
type Janitor = {
  noPhoto: KnifeRef[];
  noSessions: KnifeRef[];
  noSteel: KnifeRef[];
  noType: KnifeRef[];
  noManufacturer: KnifeRef[];
  noNotes: KnifeRef[];
  stale: (KnifeRef & { lastDate: string; daysSince: number })[];
  staleAfterDays: number;
  generatedAt: string;
};

type KnifeRef = { id: string; name: string; ownerId: string; ownerName: string };
\`\`\`

The matching UI is \`/janitor\` (also linked from the footer of
\`/stats\`).

## Facets

\`GET /api/facets\` returns the distinct, non-empty values used across
the knife corpus for every categorical attribute, with a per-value
count. Same data the homepage / \`/backlog\` filter sidebars derive
client-side — exposing it as an endpoint lets external clients
populate filter dropdowns without pulling the whole knife list.

Sort is \`count\` desc, then \`value\` asc, stable across calls. Empty
strings and missing fields are excluded — facets are for picking
something that exists, not for "no value set". \`owners\` are owner
IDs (foreign keys); hit \`/api/owners\` to resolve display names.

\`\`\`ts
type Facets = {
  manufacturers: { value: string; count: number }[];
  steels:        { value: string; count: number }[];
  types:         { value: string; count: number }[];
  owners:        { value: string; count: number }[];
};
\`\`\`

## Abrasives

\`SharpeningSession.abrasives\` is an optional ordered array of
\`Abrasive.id\`s recording the progression used in that session —
\`["shapton-400", "shapton-1000", "shapton-5000", "kangaroo-strop"]\` —
coarse → fine. Order matters and is preserved. The session POST
rejects unknown abrasive IDs with \`400\`; deleting an abrasive that
any session still references returns \`409\`.

Abrasives are the umbrella for stones, strops, and anything else you
push an edge across to refine it. The \`type\` field discriminates
(\`waterstone\`, \`diamond plate\`, \`ceramic\`, \`strop\`). Every abrasive
carries a numeric \`grit\` (the defining property for sortable
progression), a markdown \`notes\` body, and 0..n images on the same
multipart upload pattern as knife images. Thumbnails are square
(400×400 cover) rather than 3:1 — abrasives are roughly square
objects. Image bytes live under
\`$DATA_DIR/abrasive-images/<abrasive-id>/<filename>\`; deleting an
abrasive removes its image directory too.

**Strop-specific fields** are optional on every abrasive but
typically populated only when \`type === "strop"\`:

- \`compound\` — free-form, e.g. \`chromium oxide 0.5 µm\`,
  \`diamond paste 1 µm\`, or \`none\` for bare leather.
- \`substrate\` — free-form, e.g. \`leather\`, \`balsa\`, \`denim\`,
  \`kangaroo leather\`, \`MDF\`.

For a strop, \`grit\` represents the *effective* grit of the compound
(chromium oxide ≈ 60000), not the substrate. That keeps the
progression sortable end-to-end.

Grit is unitless — pick one scale (JIS by default) and stick with it
across the corpus.

## Steels

\`Knife.steel\` is a free-form string today; the matching \`Steel\`
record (when it exists) carries persistent markdown notes about that
steel — rust care, sharpening behaviour, anything worth keeping next
to the alloy rather than next to a single knife. The link is by slug:
\`slugify(Knife.steel) === Steel.id\`. Unknown strings are NOT rejected
on knife create/patch; the steel page renders fine without a record
and offers a no-notes-yet hint.

## Stats

\`GET /api/stats\` returns a single JSON object aggregated from the
markdown corpus. Pure derived view — no persistent state. Shape:

\`\`\`ts
type Stats = {
  totals: { knives: number; owners: number; sessions: number };
  sessionsByMonth: { month: string /* YYYY-MM */; count: number }[]; // last 24 months
  sessionsByOwner: { ownerId: string; ownerName: string; count: number }[];
  topKnivesBySessions: { id: string; name: string; ownerId: string; count: number }[]; // top 10
  knivesBySteel: { label: string; count: number }[];
  knivesByType: { label: string; count: number }[];
  angleHistogram: { bucket: string; count: number }[]; // whole-degree buckets
  longestGap: {
    id: string; name: string; ownerId: string;
    lastDate: string | null; daysSince: number | null;
  }[]; // top 10, never-sharpened first
  dailySessionCounts: { date: string; count: number }[]; // 53 weeks dense
  generatedAt: string;
};
\`\`\``;

export function renderApiDocs(): string {
  return `# Edgewise API

A small, single-user app for tracking sharpened knives. The HTTP API is
the only write path; the web UI uses the same endpoints. External
clients (LLMs, scripts, curl) can hit it the same way.

## Auth

Two paths, decided in \`src/proxy.ts\`:

- **Bearer token.** Send \`Authorization: Bearer <API_TOKEN>\` on every
  request. The token is set as the \`API_TOKEN\` env var on the server.
- **Session cookie.** Browsers that sign in at \`/login\` get an Auth.js
  session cookie. Same cookie satisfies the API.

No auth → \`401 {"error":"unauthorized"}\`. \`/llms.txt\` is the one
unauth'd path — it serves this same document so LLM clients can
discover the API surface from just a URL.

## Conventions

- All request and response bodies are JSON unless stated otherwise.
- Errors: \`{ "error": "...", "details"?: unknown }\`.
- Validation failures return \`400\` with Zod's flattened issues in
  \`details\`.
- IDs are slugs derived from \`name\` unless you supply \`id\` on create.
- All timestamps are server-set ISO strings.
- \`ownerId\` is a foreign key. Creating a knife with an unknown owner
  returns \`400\`. Deleting an owner with knives returns \`409\`.

## Endpoints

${ENDPOINTS}

## Examples

${EXAMPLES}

## Schemas

These are generated from the Zod definitions in
\`src/lib/storage/types.ts\` — they can't drift from what the server
actually validates.

${renderSchemas()}
`;
}
