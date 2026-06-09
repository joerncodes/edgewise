---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Knife images

> **Done.** Implemented 2026-06-09. Schema, storage methods, upload/serve/delete
> endpoints, and the UI grid all shipped. See `docs/data-model.md` (Image
> section) and `docs/api.md` for the resulting contract. Decisions made during
> implementation are noted under each "Open question" below.

Knives should support **0..n images** per knife.

## What we want

- Attach photos to a knife (before/after sharpening, chips, handle damage).
- Photos visible on the knife detail page in the UI.
- Uploadable via the API so Claude / a phone shortcut can post them.

## Open questions (resolved)

- **Storage location.** ✅ Chose `$DATA_DIR/knives/<id>/images/<filename>` —
  everything per-knife is colocated, easy to back up as one tree.
- **Frontmatter reference.** ✅ `images: [{ filename, caption, addedAt }]` on
  the knife. Order matters; first one is the "cover".
- **Per-knife or per-session?** ✅ Per-knife. Per-session can come later as
  `images` on the `Session` object.
- **Limits / formats.** ✅ JPEG/PNG/WebP, max 10 MB. No transcoding.
- **Serving.** ✅ `GET /api/knives/<id>/images/<filename>` — same auth as
  the rest of the API.

## API as shipped

- `POST   /api/knives/<id>/images` — multipart upload (`file`, optional
  `caption`). Returns the updated knife.
- `DELETE /api/knives/<id>/images/<filename>` — removes file + frontmatter
  entry.
- `GET    /api/knives/<id>/images/<filename>` — streams the bytes,
  auth-gated.

## Schema impact

Additive to `KnifeSchema`:

```ts
images: z.array(z.object({
  filename: z.string(),
  caption: z.string().optional(),
  addedAt: z.string(),
})).default([])
```

No migration needed — existing knives default to `[]`.
