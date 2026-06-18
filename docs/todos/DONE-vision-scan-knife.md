---
filetype: todo
status: done
---

# Vision-LLM "scan a knife" pre-fill

> **Shipped.** Landed as the agentic reframe below: facet tools
> (`list_steels` / `list_handles` / `list_manufacturers`) in the shared
> `LOCAL_TOOLS`; a shared `runAgentStream` extracted from the chat route;
> `POST /api/knives/scan` running a vision + tool-use loop that
> canonicalizes against the user's data, optionally `fetch_url`s a source
> page and `web_search`es, and closes with a forced `propose_knife`
> structured output; and a "Scan from photo" dialog on `/knives/new` that
> streams progress and pre-fills the form (photo doubles as the cover).
> Per-field confidence is "present vs omitted" — the model leaves
> unreadable fields blank rather than guessing. Verified end-to-end
> against a real photo. See `docs/api.md` → "Scan a knife from a photo".

Adding a knife today is: take a photo, look up the model online,
copy steel/manufacturer/handle/type into a curl call, upload the
image. Half of those steps are mechanical pattern matching that
a vision-capable LLM does in seconds — and the user already does
this loop with Claude manually almost every time a new knife
shows up.

Bake the loop into the UI.

## Update — chat shipped, reframe as agentic

When this todo was written, none of the Claude plumbing existed
yet. It now does — see [[DONE-chat-session-tool]],
[[DONE-chat-edit-session-tool]], [[DONE-chat-append-knife-note-tool]]
and the chat route itself. Reuse the pattern instead of inventing
a parallel one:

- **`ANTHROPIC_API_KEY` already exists.** Wired into
  `docker-compose.yml`, documented in `docs/deployment.md`. Drop
  the "new env var" framing — same key, same 503-when-unset
  pattern. The fix to forward it through Portainer (`68b2360`)
  also applies here.
- **Anthropic SDK call, streaming, tool-use loop** all live in
  `src/app/api/knives/[id]/chat/route.ts`. The scan endpoint is
  the same shape minus the per-knife system prompt — extract the
  shared SDK setup and tool-loop scaffolding when you write the
  second route, not preemptively now.
- **Tools framework** in `src/lib/chat/tools.ts`. `LOCAL_TOOLS` +
  `ToolContext` is the template; the scan flow gets its own
  tool set (see "Reframe" below).
- **ADR-0006's "API-only CRUD" stance is superseded by ADR-0013.**
  UI write surfaces already exist (knife/session/library forms).
  "This is the first UI write surface" is no longer true; the
  scan flow is one more form, not a special case. Update the
  "Where to look" section accordingly when implementing.

### Reframe: vision + agent, not vision-only

Original framing was "single vision call → structured output →
pre-filled form". With tools available, the scan can be a short
**agentic loop** that produces *canonicalized* output, not raw
strings:

1. Vision pass identifies what's in the photo (model name,
   stamped steel, blade shape, handle material).
2. Agent calls **`list_steels`** / **`list_handles`** /
   **`list_manufacturers`** (or whichever facet tools we add —
   probably worth adding alongside the existing `list_abrasives`)
   and maps "1.4116" → the registered steel id, "Wüsthof" →
   the existing manufacturer entry, etc. So the suggestion
   uses real foreign keys where they already exist instead of
   re-introducing free-text duplicates the user has to dedupe
   later.
3. Agent optionally calls **`list_owners`** if the photo has
   an owner-identifying detail (sticky note, tape with a name).
   Most of the time it'll skip this and leave `ownerId` blank
   for the user to fill in.
4. Agent calls **`web_search`** to fill the steel/notes
   paragraph with composition + a sentence on how it sharpens —
   same tool the chat already uses. Cite the source so the user
   sees where the claim came from.
5. Final output is a single forced tool call —
   **`propose_knife`** — whose input schema mirrors
   `KnifeInputSchema` (id-bearing fields where possible,
   free-text fallback where not). That's the structured output;
   no separate "tool use vs final message" dance.

The win over a single vision call: fewer free-text duplicates in
the facets, the agent can hedge ("I'm not sure on the handle —
left blank") instead of hallucinating, and the same prompt
template lives next to the code (`src/lib/chat/prompts/knife-scan.md`,
mirroring `knife-chat.md`).

Caveat — agent loops are slower (3–4 tool rounds → 8–15 s
wall-clock vs. ~3 s for a single call). For a flow gated behind
"I just got a new knife, let me upload a photo," that's fine.
Stream the rounds (same `tool_start` / `tool_end` / `text`
events the chat already emits) so the UI shows progress instead
of a blank spinner.

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

- **`claude-api` skill** — current model IDs, SDK usage, prompt
  caching, structured-output-via-forced-tool-use. Use when
  wiring the route.
- **`src/app/api/knives/[id]/chat/route.ts`** — working reference
  for the Anthropic SDK call, tool-use loop, streaming events.
  The scan route is structurally the same; factor shared bits
  out when you write the second one.
- **`src/lib/chat/tools.ts`** — `LOCAL_TOOLS` + `ToolContext` is
  the tool-definition pattern. The scan flow adds its own tools
  (`list_steels`, `list_handles`, `list_manufacturers`,
  `propose_knife`) here or in a sibling file.
- **`src/lib/chat/prompts/knife-chat.md`** — prose-next-to-code
  convention. Mirror it for the scan prompt
  (`src/lib/chat/prompts/knife-scan.md`).
- **`src/lib/storage/types.ts`** — `KnifeInputSchema` is what
  `propose_knife`'s input_schema should mirror. Don't reinvent
  the field set.
- **`src/app/api/knives/scan/route.ts`** — new endpoint. Auth
  same as other routes (Bearer / session via `src/proxy.ts`).
- **`src/components/knife-form.tsx`** + the existing new-knife
  flow — the scan button lives here, the agent's
  `propose_knife` payload pre-fills this form. No new write
  surface to design; just an extra entry point.

## Open questions

- **API key handling.** Already settled: `ANTHROPIC_API_KEY` is
  the shared key (see chat). If unset → 503 → UI hides the scan
  button, same pattern as the chat panel.
- **Source URL.** Many lookups start from a product page
  (Söldner, KnifeCenter). Two options now that the agent loop
  exists: (a) give the agent a `fetch_url` tool and let it pull
  the page when it wants, or (b) fetch server-side upfront and
  pass the rendered text alongside the image. Option (a) is
  cleaner — the agent only spends the tokens if the URL is
  actually useful for what's in the photo — but adds a tool with
  obvious abuse potential (SSRF). Restrict to http(s) and a
  reasonable size cap; the single-user / homelab framing makes
  this acceptable.
- **Latency.** Agent loop is 8–15 s. Stream events so the UI
  shows "looking at the photo… → checking your steel library… →
  searching the web…" instead of a blank spinner. Same
  `tool_start` / `tool_end` / `text` shape the chat already
  uses; reuse the client-side reducer in `knife-chat.tsx` as a
  reference.
- **Per-field confidence display.** Don't pretend the LLM is
  certain. The `propose_knife` schema should let the model omit
  fields it's unsure about (no `required:` beyond `name`).
  Render present fields normally, absent fields as empty
  placeholders the user fills in. Skip explicit confidence
  scores — empty vs. present is enough signal and avoids the
  UI having to interpret a 0.0–1.0 number.
- **Where the new tools live.** `list_steels` / `list_handles` /
  `list_manufacturers` would be useful to the chat too
  (cross-knife "what steels do I own?" questions). Adding them
  to `LOCAL_TOOLS` benefits both flows. `propose_knife` is
  scan-only and stays in a scan-specific file. Land the facet
  tools first as a separate small PR before the scan endpoint.
- **Image storage during the scan.** The scan endpoint receives
  the photo but the knife doesn't exist yet, so there's no
  `/data/knives/<id>/images/` directory to write to. Either keep
  the image in memory for the duration of the request and let
  the existing image-upload flow handle persistence after the
  user accepts the suggestion, or write to a temp area keyed by
  a scan-session id and promote on accept. Lean toward
  in-memory — simpler, matches the "scan is one request" framing,
  and a few MB in RSS is fine.

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

- [[DONE-chat-session-tool]], [[DONE-chat-edit-session-tool]],
  [[DONE-chat-append-knife-note-tool]] — the agentic patterns
  this todo now leans on (Anthropic SDK, tool loop, streaming,
  in-process route calls, ctx-bound writes).
- [[reference_edgewise_api]] — prod-API memory.
- ADR-0006 / ADR-0013 — the UI write story is settled; the scan
  flow is just another entry point into an existing form.
- `docs/deployment.md` — `ANTHROPIC_API_KEY` already documented.
