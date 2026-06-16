---
filetype: todo
status: done
---

# Image upload, reorder, caption, delete

The API has done the heavy lifting: `POST /api/knives/{id}/images`
(multipart), `DELETE` per filename, thumbnail generation, image
order = cover order. The UI has no upload surface. Today, adding a
photo means switching to a terminal and crafting a multipart
request, which is enough friction to skip taking the photo at all.

Same pattern applies to abrasive images (`/api/abrasives/{id}/images`)
— same UI, two endpoints.

## What we want

- A "Photos" section on `/knives/{id}` (and `/abrasives/{id}`)
  showing each image as a tile with caption + delete + drag handle.
- Upload via:
  - File picker button, OR
  - Drag-and-drop onto the section (browser File API), OR
  - Paste from clipboard (Cmd-V) when the section is focused —
    great for screenshots and "save image from web".
- After upload: server returns the updated entity; tiles re-render
  with the new image at the end of the array (cover unchanged
  unless it's the first image).
- Drag-to-reorder via `@dnd-kit`. The first tile is the cover; show
  a small "COVER" badge on tile index 0. Persist with a PATCH that
  rewrites the whole `images[]` array (server already accepts).
- Caption edit: inline edit on each tile; debounced PATCH to the
  parent entity (image metadata lives in the parent frontmatter, no
  per-image endpoint).
- Delete: trash icon → `AlertDialog` ("Delete this photo? The file
  on disk goes too.") → `DELETE` → refetch.

## Open questions

- **Single shared component or per-entity?** Abrasive and knife
  images share the `ImageRef` shape (per CLAUDE.md and
  `docs/data-model.md`). Make one `<ImageGallery>` component that
  takes `{ images, onUpload, onReorder, onCaptionChange, onDelete }`
  callbacks. Each detail page wires it to the right endpoints
  (`api.imageUrl` vs `api.abrasiveImageUrl`, etc.).
- **Multipart upload from the browser.** `FormData` + `fetch`
  bypasses the JSON `api-client.ts` `request<T>` shape. Add a
  parallel `uploadImage(id, file)` helper that handles multipart
  + the response unwrap; don't try to shoehorn it into the
  JSON request helper.
- **Caption persistence.** Captions are part of the `Knife.images[]`
  array, so saving a caption is a `PATCH /api/knives/{id}` with the
  full `images` field. The endpoint already accepts this. Debounce
  to ~500ms on input so we don't PATCH on every keystroke.
- **Reorder cover semantics.** Dragging a non-cover tile to index 0
  changes the cover photo everywhere it's rendered (homepage hero,
  cards, abrasives list thumbnail). Worth a subtle UI hint so the
  user knows the consequence.
- **Upload size + type errors.** API rejects >10 MB and anything
  not jpeg/png/webp. Surface server-side validation errors as toast
  messages; don't try to pre-validate in the browser (the rule
  lives server-side, don't duplicate it).
- **HEIC.** iPhone screenshots default to HEIC. API doesn't accept
  it. Either:
  1. Pre-convert in the browser via a wasm decoder. Heavy.
  2. Tell the user to share-as-JPEG. Practical, since most iPhones
     do this automatically when sharing.
  Defer (1) until it actually bites; document (2).
- **Order persistence vs the array.** Server stores `images[]` in
  insertion order. The PATCH-with-full-array model is fine for now
  but should be documented as the reorder contract.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — replaces the existing
  hero + gallery block with a managed `<ImageGallery>`.
- **`src/app/abrasives/[id]/page.tsx`** — same wiring, different
  endpoint base.
- **`src/lib/api-client.ts`** — add `uploadKnifeImage`,
  `uploadAbrasiveImage`, `updateKnife({ images })` calls.
- **`src/app/api/knives/[id]/images/route.ts`** — already accepts
  multipart on POST; reread to confirm response shape.
- **`src/lib/storage/types.ts`** — `ImageRefSchema` is the shape
  PATCH-images writes through.
- **`@dnd-kit`** — already a dep; backlog/table reorder shows the
  call shape.

## Out of scope

- Per-image rotation or cropping. The server's `sharp` step
  honours EXIF orientation; manual rotation is a future thing.
- Tagging photos with their session ("before/after on
  2026-06-10"). The frontmatter doesn't carry the link and adding
  it is a separate decision.
- Generating multiple thumbnail sizes. ADR-0011's single
  on-demand thumb is enough until proven otherwise.

## Related

- [[ui-crud-foundation]] — pattern source.
- ADR-0010 / ADR-0011 — thumbnail strategy.
- [[DONE-images]] — the underlying API surface.
- [[DONE-thumbnails]] — thumbnail generation.
- `docs/data-model.md` — `ImageRef` shape and on-disk layout.
