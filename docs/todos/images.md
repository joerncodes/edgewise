# Knife images

Knives should support **0..n images** per knife.

## What we want

- Attach photos to a knife (before/after sharpening, chips, handle damage).
- Photos visible on the knife detail page in the UI.
- Uploadable via the API so Claude / a phone shortcut can post them.

## Open questions

- **Storage location.** Two options:
  - `\$DATA_DIR/knives/<id>/images/<filename>` — keeps everything next to the
    markdown file, easy to back up as one tree. Probably this.
  - A flat `\$DATA_DIR/images/` bucket referenced by hash. Decouples photo
    storage from knife id; survives renames cleanly. More complexity.
- **Frontmatter reference.** Add `images: [{ filename, caption?, addedAt }]`
  to the knife frontmatter. Order matters; first one is the "cover".
- **Are images per-knife or per-session?** Default to per-knife. Per-session
  is a v2 step (would just be `images` on the `Session` object).
- **Limits / formats.** JPEG/PNG/WebP, max ~10 MB each, no transcoding on
  upload for now. The reverse proxy or a future Next.js Image setup can
  handle resizing.
- **Serving.** New `GET /api/knives/<id>/images/<filename>` route, or a
  static mount? An API route keeps auth uniform — probably worth it.

## Sketch of the API

- `POST /api/knives/<id>/images` — multipart upload, returns the updated
  knife with the new image entry.
- `DELETE /api/knives/<id>/images/<filename>` — remove file + frontmatter
  entry.
- `GET  /api/knives/<id>/images/<filename>` — stream the bytes, auth-gated.

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
