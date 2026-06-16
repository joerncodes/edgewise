---
filetype: todo
status: done
---

# New-knife form

The most common write flow: someone hands me a knife to sharpen,
and I want to record it before I forget. Today this means flipping
to a terminal and curling `POST /api/knives` with hand-written
JSON. Make it a form.

## What we want

- `/knives/new` page with a form covering every `KnifeInput` field
  that isn't auto-derived.
- Required: `name`, `ownerId`. Everything else optional.
- Submit → `api.createKnife()` → redirect to `/knives/{id}`. Toast
  on error with the message from the API (`owner not found`,
  `knife already exists`, etc.).
- A "Create another" mode after success, optional — useful when a
  customer drops off five knives in one go. Default: redirect to
  detail.
- "Add knife" button on the homepage (next to the search/filter
  bar) and on each owner's detail page (pre-fills `ownerId`).

## Open questions

- **Owner selector.** Three options:
  1. `<Select>` with all existing owners. Simple, works when
     there are <50 of them — which will be the case forever.
  2. `<Combobox>` with type-ahead. Same data, fancier UX.
  3. Pre-filled when the form is reached from an owner page;
     plain dropdown otherwise.
  Lean (1) + (3) — adding a new owner inline is rare; if it
  happens, link to `/owners/new` from the dropdown's footer.
- **Adding an owner from the knife form.** Don't try to inline
  owner creation. The form lives on `/owners/new` per
  [[ui-owner-crud]]. From the knife form, surface a small "+ new
  owner" link that opens `/owners/new?returnTo=/knives/new`.
- **Open-list autocomplete.** `type`, `subtype`, `manufacturer`,
  `steel`, `handle` — all free strings with observed-value
  suggestions. Use the `Combobox` pattern from
  [[ui-crud-foundation]], sourced from `GET /api/facets`. New
  values still allowed.
- **Subtype contextual to type.** When the user picks (or types)
  a `type`, the `subtype` combobox should narrow its suggestions
  to subtypes observed under that type — same logic as the
  nested sidebar filter. The user can still type a new value.
- **Initial backlog state.** Most new knives ARE in the backlog
  ("just dropped off"). Default the `backlog` checkbox to
  checked; the user uncheck if they're recording a knife they've
  already sharpened.
- **Initial photo.** Allow uploading one image in the same form
  (becomes the cover). The full image management UI is
  [[ui-image-upload]] — this is the single-cover-image fast path.
  If the upload fails after the knife is created, surface the
  knife was saved + the image step failed, link to detail.

## Where to look

- **`src/app/api/knives/route.ts`** — POST handler is already
  shaped for this; nothing to change server-side.
- **`src/lib/storage/types.ts`** — `KnifeInputSchema` is the
  validation source of truth.
- **`src/components/knife-filters.tsx`** — the
  `subtypesByType` lookup pattern is reusable for the contextual
  subtype combobox.
- **`src/app/owners/[id]/page.tsx`** — the per-owner "Add knife"
  CTA lands here.

## Out of scope

- Sessions on create. A new knife starts with zero sessions; add
  the first one from the detail page (see [[ui-session-form]]).
- Multiple images on create. One cover only here; the full
  gallery flow is [[ui-image-upload]].
- Custom `id` override. The slug is derived from the name. If
  this becomes annoying (collision on a duplicate name), revisit
  in [[ui-knife-edit-delete]] — not blocking v1.

## Related

- [[ui-crud-foundation]] — the form pattern this implements.
- [[ui-knife-edit-delete]] — sibling flow for existing knives.
- [[ui-owner-crud]] — where the owner-not-found case sends you.
- ADR-0006 (superseded) and its replacement from
  [[ui-crud-foundation]].
