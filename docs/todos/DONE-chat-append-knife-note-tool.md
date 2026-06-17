---
filetype: todo
status: done
---

# Chat tool: append to the knife's notes

Follow-up to [[DONE-chat-session-tool]] and
[[DONE-chat-edit-session-tool]]. The pattern that keeps showing up
mid-chat is "huh, I noticed X" — the convex didn't take the 1k
well, the handle scales loosened up again, the owner mentioned
they want it more aggressive next time. Today you have to remember
to flip out to the detail page and add it to the notes field.
Don't.

The deliberate design choice here: **append-only, one note at a
time, no rewrites.** Typo fixes and full edits stay on the detail
page where inline edit already handles them. The chat is a
notebook, not a text editor — that framing keeps the blast radius
tiny (the model can only ever *add* text, never lose what was
already there) and the prompting story trivial.

## What we want

- A new local tool `append_knife_note` next to the existing session
  tools in `src/lib/chat/tools.ts`.
- One required input: `note: string` (non-empty). The tool reads
  the current `knife.notes`, concatenates with a blank-line
  separator (`current + "\n\n" + note` — or just `note` if current
  is empty/whitespace), and PATCHes the knife.
- No `mode: replace`. No way to delete or rewrite existing text via
  this tool. If the user asks "rewrite the notes to …", the model
  should say "use the detail page's edit field — I can only append
  here." Write this rule into the tool description and the system
  prompt so the model doesn't go looking for a workaround.
- Knife id from `ToolContext`, never the model. Same as the session
  tools.
- Routes through `PATCH /api/knives/[id]` in-process. The existing
  route accepts `notes` as a partial-update field via
  `KnifeInputSchema` (it merges over the existing knife). One
  module hop, no auth juggling — same trick as `log_session` and
  `edit_session`.

## System prompt updates

- Add an `append_knife_note` bullet to
  `src/lib/chat/prompts/knife-chat.md`:
  - Same "edit IS the consent, no good-to-go preamble" rule that
    took two passes to land on `log_session`.
  - Sequence in one turn: `append_knife_note` → short
    confirmation reply.
  - Pass the note **exactly as the user phrased it** when they
    quote a specific sentence ("add: 'wedges in carrots'"). When
    the user describes an observation in prose, paraphrase it into
    a short note — one sentence, no preamble like "Observation:".
    Match the existing notes style if possible (the model has the
    current notes in the system prompt; mimic the tone).
  - Date prefixes are NOT added automatically. If the user wants
    a date in the note, they'll say so.
  - For rewrites or deletions, redirect to the detail page edit.

## Where to look

- **`src/lib/chat/tools.ts`** — `log_session` and `edit_session`
  are the templates. Same `ctx.knifeId` binding, same in-process
  route call.
- **`src/app/api/knives/[id]/route.ts`** — `PATCH` handler. Takes
  a partial `KnifeInputSchema`; only `notes` will be set in the
  body. The schema merge is done route-side (it spreads the
  existing knife under the patch), so the tool only sends the
  new notes string.
- **`src/lib/chat/system-prompt.ts`** — the current notes are
  already rendered into the system prompt under
  "### Notes from the owner". After a successful append, the *next*
  turn's system prompt will reflect the new notes — that's
  desirable; nothing to change here.
- **`src/lib/chat/prompts/knife-chat.md`** — prose update.
- **`src/components/knife-chat.tsx`** — add a `TOOL_LABELS` entry
  ("Adding to notes", probably the `StickyNote` lucide icon to
  keep tool chips visually distinct from the `Pencil` used for
  session edits). Add the tool name to the `WRITE_TOOLS` set so
  the page refreshes after a successful write.

## Open questions

- **Separator.** Two newlines (paragraph break) vs one (line
  break). Two reads better when the existing notes are
  prose-style paragraphs, which is what the user actually writes.
  Locked in: `"\n\n"`. Trim the existing notes' trailing
  whitespace before joining so we don't accumulate blank lines on
  back-to-back appends.
- **Empty/whitespace notes.** If `knife.notes` is empty or only
  whitespace, just store the note as-is — no leading separator.
- **Validation.** Reject empty / whitespace-only `note` input on
  the tool side rather than letting the API merge a no-op write.
  Error string the model can recover from ("note must not be
  empty — call again with content, or tell the user you have
  nothing to add").
- **Race with the detail page.** Single user. If the user edits
  the notes on the detail page mid-chat, the *next* chat turn
  reads fresh from disk via the system prompt; this turn's
  append is over the version we last read. Acceptable — last
  write wins, the existing detail-page edit also rewrites the
  whole field, and the chat is always operating on a recent
  snapshot. Don't add optimistic locking.
- **Cap on note size.** None for v1. If notes balloon, that's a
  signal to factor a "log book" entity out, not to police the
  field.

## Out of scope (v1)

- **Rewriting / replacing existing notes.** Detail page only.
- **Deleting notes** via chat. Same.
- **Per-session notes.** Already covered by
  [[DONE-chat-edit-session-tool]]'s `notes` field.
- **Appending to owner / abrasive notes** via chat. Same pattern
  would work but each is its own scoping call; do it when there's
  a concrete reason rather than speculatively.

## Related

- [[DONE-chat-session-tool]], [[DONE-chat-edit-session-tool]] —
  prior write tools; share the prompting lessons and the
  in-process PATCH pattern.
- [[chat-tool-use-writes]] — broader thread on writes-via-chat.
- ADR-0006 / ADR-0013 — writes via `/api/*`.
- [[feedback_writes_via_api]] — same rule, memory side.
