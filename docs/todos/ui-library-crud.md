---
filetype: todo
status: open
---

# Library CRUD UI — steels, handles, abrasives

The three "library" entities are reference data for knives and
sessions: `Steel`, `Handle`, `Abrasive`. They share the small-form
shape (a few fields, markdown body) and they share their referential
pattern (knives soft-reference steels/handles by string, sessions
hard-reference abrasives by id with 409 on delete-if-in-use).

This is one bundled todo because all three want the same form and
the same write surface; splitting it would be three near-identical
docs.

## What we want

For each of `/steels`, `/handles`, `/abrasives`:

- "Add" CTA on the list page → `/{entity}/new` form.
- Edit on detail page → inline form, same pattern as
  [[ui-knife-edit-delete]].
- Delete on detail page → `AlertDialog`. Abrasive delete may 409
  (sessions reference it); pre-check via the loaded sessions /
  knives and disable with a hint, mirroring
  [[ui-owner-crud]]'s approach.

Per-entity field sets:

- **Steel:** `name` (required), `composition`, `notes`.
- **Handle:** `name` (required), `notes`.
- **Abrasive:** `name` (required), `grit` (required, number),
  `type` (combobox: waterstone / diamond plate / ceramic / strop;
  open list), `compound` (strop-only), `substrate` (strop-only),
  `notes`. Plus the same image management surface from
  [[ui-image-upload]] for the abrasive image bytes.

## Open questions

- **Type/compound/substrate visibility.** Strop fields are
  irrelevant for a waterstone. Hide `compound` and `substrate`
  unless `type === "strop"`, but persist them silently if
  already set (don't blow away data on first edit).
- **Grit input.** Plain number, but a small visual hint of where
  the grit falls on a coarse→fine scale is nice. Out of scope
  for v1; just a `<Input type="number">` with `min={1}`.
- **Steel `composition` shape.** Free-form string ("0.8% C,
  0.5% Cr, …"). No structured editor.
- **Soft references on rename.** Knives reference steels/handles
  by string. Renaming a Steel doesn't update the knife strings.
  This is documented in `docs/data-model.md` — the slug-based
  group still binds them. Surface a small "N knives reference
  this string" hint in the edit form so the user knows the
  rename is display-only.
- **Backfilling library entries from observed strings.** Today
  you can have a knife with `steel: "AUS-8"` and no `Steel`
  record. Worth a "Promote to library" affordance on the knife
  detail's Steel link when no record exists? Defer — different
  todo.

## Where to look

- **`src/app/{steels,handles,abrasives}/page.tsx`** — list
  pages, each gets an "Add" CTA.
- **`src/app/{steels,handles,abrasives}/[slug]/page.tsx`** — detail
  pages, each grows edit + delete affordances.
- **`src/app/api/{steels,handles,abrasives}/`** — already shaped.
- **`src/lib/storage/types.ts`** — `SteelInputSchema`,
  `HandleInputSchema`, `AbrasiveInputSchema`.

## Out of scope

- Steel hardness charts. A `notes` body covers it.
- Cross-entity links ("which handles get paired with which
  steels in practice"). Statistical, derivable from the corpus,
  not a write concern.
- Abrasive sets / progressions saved as named templates ("my
  EDC progression: 400 → 1000 → 5000 → strop"). Interesting but
  separate; sessions already record the actual progression.

## Related

- [[ui-crud-foundation]] — pattern source.
- [[ui-image-upload]] — abrasive images live there too.
- [[DONE-strops]] — why abrasive is one entity with a `type`
  discriminator instead of separate `Stone` / `Strop` tables.
- [[DONE-steels]] / [[DONE-handles]] / [[DONE-stones]] — the
  underlying entities and their list/detail pages.
- `docs/data-model.md` — referential rules (soft refs for
  steel/handle, hard for abrasive).
