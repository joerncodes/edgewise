---
filetype: todo
status: done
completedOn: 2026-06-11
---

# Handle materials need a real detail page

> **Done.** Implemented 2026-06-11, mirroring Steel almost verbatim.
> `Handle` entity stored under `$DATA_DIR/handles/<slug>.md`, full
> CRUD via `/api/handles` and `/api/handles/{id}` (409 on
> delete-if-referenced). No `composition` field — handle materials
> are described entirely in the markdown body. `Knife.handle` stays
> a soft FK; unknown strings are not rejected and the handle page
> falls back to a no-notes-yet hint when no record exists.
> `/handles` list merges derived entries with persisted records and
> shows the same "No notes yet" subtitle as `/steels`.
> `/handles/<slug>` renders the markdown notes above the knives
> grid, mirroring `/steels/<slug>`. Data-model + api docs + the
> `/api/docs` and `Handle` Zod schemas were all updated per
> ADR-0009.
>
> Seed content (G10, Micarta, Beech wood, "None") was NOT written
> as part of this change — those notes live on prod and should be
> backfilled via `PATCH /api/handles/<slug>` (per
> [[feedback_writes_via_api]]), not by editing files on disk.

`/handles/<slug>` exists ([[DONE-handle-material]]) and lists the
knives that share a material, but it stops there. There's nowhere
to explain *what the material is* — "G10 is a fiberglass-resin
laminate, common on tactical folders, grippy when wet" — which is
exactly the kind of context that makes the index useful when
browsing.

The original handle-material todo flagged this trade-off and chose
to keep handle as a free-form string for v1, on the bet that
cardinality would be high and per-material notes wouldn't be worth
writing. That's no longer true — picking up the Spyderco, the
Yaxell, the Opinel, and the Nico Baumann into the same vocabulary
("G10", "Micarta", "Beech wood", "None") puts the cardinality low
enough that material notes make sense.

## What we want

- A markdown notes body on each handle material, rendered above the
  knives grid on `/handles/<slug>`. Same shape and behaviour as
  `/steels/<slug>`: persistent notes that live independently of any
  knife.
- A way to write those notes via the API (so the seed material —
  G10, Micarta, etc. — can be filled in without manual file edits;
  see [[feedback_writes_via_api]]).
- Soft FK behaviour like Steel: `Knife.handle` is still a string,
  `slugify(Knife.handle) === Handle.id`, no rejection of unknown
  strings.

## Suggested shape

Mirror Steel almost verbatim. Add a new ADR if the design departs
from that mirror.

- `HandleSchema` / `HandleInputSchema` in `src/lib/storage/types.ts`:
  `{ id, name, notes, createdAt, updatedAt }`. No composition
  field — that's a steel concept.
- `Storage` interface gets `listHandles / getHandle / saveHandle /
  deleteHandle`, MarkdownStorage writes them under
  `$DATA_DIR/handles/<slug>.md`.
- `/api/handles` route handlers, list + per-id, matching steels.
- `/handles/page.tsx`: continue to derive entries from knife
  frontmatter (so a handle string with no `Handle` record still
  shows up), but cross-reference `listHandles()` to render the
  display name from the canonical record when one exists. Same
  pattern manufacturers/steels use.
- `/handles/[slug]/page.tsx`: when a `Handle` record exists, render
  the `Markdown` notes body above the knives grid. When it
  doesn't, render an empty-state CTA "no notes yet, PATCH via
  API".
- Janitor lens: a "handle records missing notes" bucket? Probably
  not — same noise argument as the original handle-material todo.

## Seed content

Pre-write notes for the four materials currently on prod knives
(G10, Micarta, Beech wood, None). Two paragraphs each, covering:
what the material is, how it behaves on a knife (grip, water,
care), and any sharpening-relevant quirks (e.g. "Micarta soaks
sweat, eventually darkens; that's not damage").

The "None" entry deserves a one-liner — it's the explicit "blade
only" case (Nico Baumann's sheepsfoot blank), not "missing data".
That distinction matters for the janitor lens and for the index
page reading correctly.

## Open questions

- **Soft vs hard FK.** Stay soft, like Steel. The whole point is
  that you can record a knife with an unfamiliar handle before
  you've written the notes.
- **Per-material images.** Not yet. Abrasive carries images for a
  reason (the user wants to remember *which* physical stone);
  G10 doesn't need a photo. Skip until asked.
- **Promotion of `Manufacturer` to first-class while we're here.**
  Out of scope. Manufacturers already work fine as derived
  entries; this todo is specifically about handle materials
  needing prose.

## Related

- [[DONE-handle-material]] — the original decision to defer
  first-class promotion.
- [[DONE-steels]] — the closest precedent; mirror its shape.
- ADR-0006 — API-only CRUD. Write notes via PATCH /api/handles/{id},
  not by editing files directly.
