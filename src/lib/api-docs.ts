import { z } from "zod";
import {
  KnifeInputSchema,
  KnifeSchema,
  OwnerInputSchema,
  OwnerSchema,
  SharpeningSessionSchema,
  KnifeImageSchema,
} from "@/lib/storage/types";

const SCHEMAS = {
  Knife: KnifeSchema,
  KnifeInput: KnifeInputSchema,
  Owner: OwnerSchema,
  OwnerInput: OwnerInputSchema,
  SharpeningSession: SharpeningSessionSchema,
  KnifeImage: KnifeImageSchema,
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
| GET    | \`/api/stats\`                          | —                  | aggregate stats (see below) |
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

# Aggregate stats — sessions/month, per-owner counts, angle histogram, etc.
curl -s $BASE/api/stats -H "Authorization: Bearer $TOKEN" | jq
\`\`\`

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
