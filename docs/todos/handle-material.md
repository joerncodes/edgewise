---
filetype: todo
status: open
---

# Handle material as a knife property

`Knife` currently tracks `manufacturer`, `steel`, and `type` —
nothing for the handle. The owner's existing notes already carry a
`handle:` field in the frontmatter (G10, micarta, wood, horn,
stag, etc.), and it matters for sharpening context (how aggressive
can I clamp this thing, can I get it wet, etc.) and for browsing
("show me all the wood-handled paring knives").

## What we want

- New optional string field on `Knife`: `handle`. Free-form, same
  shape as `steel` and `manufacturer` today.
- Render it on the knife detail page in the `PropertyList`
  (`src/app/knives/[id]/page.tsx`) next to Steel, with an icon
  (lucide has `Grip` or `Hand` — pick whichever reads as
  "handle"). Linkify like the other property rows once a `/handles`
  page exists; until then plain text is fine.
- API picks it up automatically — `PATCH /api/knives/{id}` already
  accepts arbitrary `Partial<Knife>` and the Zod schema generates
  the OpenAPI surface for `/api/docs`.

## Open questions

- **Name: `handle` or `handleMaterial`?** Lean `handle` — short,
  matches the owner's existing vault frontmatter, parallel to
  `steel` (which also is shorthand for "blade steel"). The
  field name is the material; the human reading it knows it's the
  handle. Pick `handleMaterial` only if there's a future reason to
  also have `handleShape` or `handleColor` as siblings.
- **First-class entity, like `Steel`?** Probably not in v1. Handles
  are less interesting than steels (less to write notes about) and
  the cardinality is high (every wood handle is "wood" but every
  wood handle is also different). Start as a free-form string; if a
  `/handles` index becomes useful later, promote the same way
  manufacturers → steels was promoted ([[manufacturers]],
  [[steels]]).
- **`/handles` index page.** Defer. The free-form string is enough
  for filtering on the home page (already supports search across
  `name`, `owner`, `type`, `steel` — add `handle` to that search
  needle). A dedicated index can come later if cardinality stays
  low.
- **Janitor.** Add a "knives missing a handle material" lens to
  `/janitor`? Probably not — handle isn't always known
  (drop-offs from coworkers especially), so flagging it as missing
  would be noisy. Skip unless the user asks.

## Notes for whoever picks this up

- Schema change in `src/lib/storage/types.ts`:
  `handle: z.string().optional().default("")` on `KnifeSchema`.
  Additive — no migration, absent === "".
- Update `docs/data-model.md` with the new field.
- Update `docs/api.md` with the new field in PATCH/POST examples.
- Bump the homepage search to also match `handle` substring
  (`src/app/page.tsx`, the `needle` filter around line 54).
- ADR-0006 still applies — writes via `/api/*`. If a UI write
  form lands later, route through the existing PATCH endpoint.
- See [[steels]] for the additive-schema-field precedent and the
  shape of the property row.
