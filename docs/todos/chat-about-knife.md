---
filetype: todo
status: open
---

# "Chat about this knife" — read-only prototype

When looking at a knife in Edgewise, half the questions the user
asks ("is W2 supposed to take a 17° edge?", "what's the going rate
for a Wüsthof Classic IKON these days?", "who made this profile
popular?") still get answered in a separate Claude tab, then
hand-copied as a note. The detail page already has all the context
that would seed those conversations — knife, owner, every session,
angles, abrasives used. Put a chat next to it.

Scope this one as **read-only first**: Claude can see the knife and
search the web, but cannot mutate Edgewise data. That's the safe
half of [[chat-tool-use-writes]] (a follow-up todo if this one
proves out) and gets us the value with none of the
hallucinated-angle-in-the-data risk discussed when the feature was
first sketched.

## What we want

- A "Chat" panel on `/knives/[id]` — collapsible, lives next to the
  existing knife detail. Not a separate page; the whole point is to
  stay anchored to the knife in view.
- One conversation per page load. No persistence across refreshes
  in v1 — if it turns out to be useful, persisting threads is a
  later todo.
- The model sees, in the system prompt:
  - The full knife object (name, manufacturer, steel, handle,
    type, subtype, notes).
  - The owner (name + notes).
  - Every session (date, angle, abrasives in order, notes,
    rating).
  - A short instruction: "You are answering questions about this
    one knife. Be concise. Cite web sources when you use them."
- The model has **two tools**:
  - `web_search` — Anthropic's built-in server-side web search
    tool. Lets it look up steel datasheets, manufacturer pages,
    forum threads, current resale prices.
  - **(nothing else in v1.)** No Edgewise tools yet — the whole
    knife is in the system prompt already, and adding tools means
    deciding which ones are safe.
- Streaming response. Show partial assistant text as it arrives,
  plus a small "searching the web…" indicator when a tool use
  block is in flight, plus rendered citations at the end.

## Where to look

- **`claude-api` skill** — current model IDs, SDK usage, prompt
  caching, tool-use streaming. Use it when wiring the route. The
  same skill was called out in [[vision-scan-knife]]; same
  reasoning here.
- **Anthropic web search tool** — Anthropic's hosted server-side
  tool, declared as `{ type: "web_search_20250305", name:
  "web_search" }` (verify exact type string via the skill / docs
  before wiring). Server-side means we don't implement the fetch
  loop — the API does it and we just stream results.
- **`src/lib/storage/types.ts`** — `Knife`, `Owner`,
  `SharpeningSession`. The system prompt builder lives next to the
  route and serializes these directly; no new schema needed.
- **`src/app/api/knives/[id]/route.ts`** — same `await params`
  shape applies to the new sub-route.
- **`src/proxy.ts`** — chat endpoint sits under `/api/`, so it
  inherits Bearer-token / session auth for free. Don't add a
  separate path.
- **`src/app/knives/[id]/page.tsx`** — host for the chat panel.
  Keep the chat component `"use client"`; the page stays a server
  component and passes the knife id down.

## Open questions

- **API key handling.** New env var `ANTHROPIC_API_KEY`. Optional —
  if unset, the chat endpoint returns 503 and the UI hides the
  panel. Same pattern as the one [[vision-scan-knife]] proposes;
  share the env var, don't introduce two.
- **Model choice.** `claude-sonnet-4-6` is the default; cheap
  enough for this kind of single-user back-and-forth, and the web
  search tool works on it. Opus is overkill for "what's W2?".
- **Cost ceiling.** A runaway tool loop is the realistic failure
  mode. Cap `max_tokens` per turn, cap the number of web searches
  per turn (the tool supports `max_uses`), and log token spend
  per request so the user notices a creeping bill.
- **Where conversation state lives.** v1: client holds the array
  of `{ role, content }` and POSTs the whole thing each turn.
  Server is stateless. Simple, fits the rest of the app, and lets
  prompt caching do its job because the system prompt is constant.
- **Prompt caching.** The system prompt (knife + sessions + owner)
  is constant across a conversation and re-sent every turn. Mark
  it as a `cache_control: { type: "ephemeral" }` block so the
  second turn onward is cheap. Worth it even for a single-user app
  because long sessions add up.
- **Citations rendering.** Anthropic returns citations as
  structured blocks alongside text. Don't paste them inline as
  `[1]`-style references; render a small "Sources" list under the
  assistant turn with title + URL pulled from the citation block.
- **Rate limiting.** Single user, homelab. Skip it. Trust the
  Bearer token / session and the cost cap above.

## Out of scope (v1)

- **Write tools.** No "log a session via chat", no edits, no
  deletions. Splits to its own todo when this one is in hand —
  see [[chat-tool-use-writes]].
- **Cross-knife queries.** "Which of my knives are due for
  re-profiling?" is interesting but means another set of tools and
  a different host page. Out for now.
- **Persisted conversations.** No `chats/<id>.md` on disk in v1.
  If threads turn out to be worth keeping, they become a real
  entity with their own ADR.
- **Image input.** The knife's images are *not* fed to the model
  in v1. Vision is [[vision-scan-knife]]'s problem; the chat is
  text-only until that lands and we know what the right shared
  helper looks like.
- **Switching providers.** Anthropic only, no UI to pick. Same
  reasoning as [[vision-scan-knife]] — user already has the
  relationship.

## Related

- [[vision-scan-knife]] — also uses the Anthropic SDK; share the
  env var (`ANTHROPIC_API_KEY`) and the cost-cap thinking.
- [[reference_edgewise_api]] — prod env layout for the new key.
- ADR-0006 / ADR-0013 — the chat endpoint sits under `/api/`, so
  this stays consistent with "API is the contract". When write
  tools land, the tools themselves will call the same `/api/*`
  routes the UI uses, not the storage layer directly.
- `docs/deployment.md` — env var to add to the Portainer stack.
