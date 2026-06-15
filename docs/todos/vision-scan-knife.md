---
filetype: todo
status: open
---

# Vision-LLM "scan a knife" pre-fill

Adding a knife today is: take a photo, look up the model online,
copy steel/manufacturer/handle/type into a curl call, upload the
image. Half of those steps are mechanical pattern matching that
a vision-capable LLM does in seconds — and the user already does
this loop with Claude manually almost every time a new knife
shows up.

Bake the loop into the UI.

## What we want

- An endpoint, probably `POST /api/knives/scan`, that takes
  multipart: an image plus an optional source URL.
- Server-side calls a vision-capable model (Claude API by
  default — `claude-opus-4-7` or `claude-sonnet-4-6` for cost
  reasons) with a structured-output schema matching
  `KnifeInput`'s suggestable fields: `name`, `manufacturer`,
  `steel`, `handle`, `type`, and a free-text `notes` paragraph.
- Returns `{ suggestion: Partial<KnifeInput>, confidence: …,
  rawResponse: … }`. Confidence is per-field, not overall — the
  model often nails the manufacturer but guesses on steel.
- UI: a "Scan from photo" button on the new-knife flow. Opens a
  file picker, shows a confirm-and-edit form pre-filled with the
  suggestion. User reviews, fixes, hits save → normal
  `POST /api/knives` + image upload.

## Where to look

- **Claude API skill** — there's a `claude-api` skill that knows
  the SDK, prompt caching, structured output via tool use,
  current model IDs. Use it when implementing the model call.
  See also @CLAUDE.md (no direct reference yet) and
  [[reference_edgewise_api]] for the existing API token shape.
- **`src/lib/storage/types.ts`** — the schema the structured
  output should match. Don't reinvent the field set.
- **`src/app/api/knives/scan/route.ts`** — new endpoint. Auth
  same as other routes (Bearer / session via `src/proxy.ts`).
- **UI host page** — probably a new `/knives/new` route, since
  the rest of the app is read-only from the UI today (see
  [[ADR-0006]]). This is the first real UI write surface; do it
  properly, don't slip a half-form into the index.

## Open questions

- **API key handling.** New env var `ANTHROPIC_API_KEY` —
  optional. If unset, the endpoint returns 503 and the UI hides
  the scan button. Don't bake the feature into the runtime cost
  for users who don't want it.
- **Source URL.** Many of the lookups in this app start from a
  product page (Söldner, KnifeCenter). Passing the URL alongside
  the image lets the model cross-reference: it can read what
  the seller claims about steel/length/lock. Either fetch the
  URL server-side and feed the model both the image and the
  page text, or just hand the URL to the model and let it call
  out (more fragile). Start with: fetch the URL server-side,
  pass the rendered text alongside the image.
- **Latency.** A vision call takes a few seconds. The UI must
  not block — show a skeleton, allow the user to cancel and
  fall back to manual entry.
- **Per-field confidence display.** Don't pretend the LLM is
  certain. Render suggested fields with a different background,
  and require a click-to-accept (or just an explicit save) so
  the user can't slip in wrong steel by accident.

## Out of scope

- Multi-image scanning ("here's the box, here's the blade").
  One photo is enough for v1.
- Auto-creating the knife without review. The whole point is
  human-in-the-loop.
- Vision for *sessions* (e.g. recognizing a bevel angle from a
  photo). Different problem.
- Bring-your-own-model UI (OpenAI / local). Claude API only —
  user already has the relationship.

## Related

- [[reference_edgewise_api]] — the prod-API memory; new env var
  goes alongside `API_TOKEN`.
- ADR-0006 — API-only CRUD. This todo proposes the first UI
  write surface; that ADR will need a follow-up ADR (or an
  amendment note) when this lands.
- `docs/deployment.md` — env vars to set in the Portainer stack.
