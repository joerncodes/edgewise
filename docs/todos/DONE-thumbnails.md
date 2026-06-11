---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Cache thumbnails for knife card images

> **Done.** Implemented 2026-06-09. `sharp` generates a 600×200 JPEG
> thumb at upload time, stored next to the original as
> `<basename>.thumb.jpg`. The image endpoint accepts `?size=thumb` and
> falls back to the original if no thumb is on disk.
> `scripts/backfill-thumbs.mjs` (`pnpm backfill:thumbs`) handles
> pre-existing uploads. ADR-0010 codifies "backfill, no create-on-miss".

Right now the home page card grid serves the full-resolution upload for
every cover image — `src/components/knife-card.tsx` renders an `<img>`
pointed at `GET /api/knives/{id}/images/{filename}`, which streams the
original bytes from disk (`saveKnifeImage` writes a single file per
image, no derivative sizes). With ~20 knives and JPEGs in the 1–4 MB
range, the home page pulls megabytes of pixels just to draw a row of
3:1 thumbnails. Painful on mobile, painful on cold cache.

## What we want

- A second size next to every uploaded image — a small thumbnail used
  by card-grid pages (home, manufacturer detail, owner detail).
- Generated **once on upload**, written to disk alongside the original
  so it's served as static-ish bytes, no per-request resize.
- Served via the existing image endpoint with a size hint:
  `GET /api/knives/{id}/images/{filename}?size=thumb` returns the
  thumbnail; no `size` returns the original. Same auth as today.
- Card components switch to the thumbnail URL; detail/hero pages keep
  using the original.

## On-disk shape

For each upload, write both:

- `<DATA_DIR>/images/<knifeId>/<basename>.<ext>` — original (unchanged).
- `<DATA_DIR>/images/<knifeId>/<basename>.thumb.<ext>` — derivative.

Thumb target: 600×200 cover for 3:1 cards, JPEG quality ~80, max ~50KB.
Pick one size for now — don't build a parameterized resizer.

## Open questions

- **Resize library.** Three options:
  1. `sharp` — fast (libvips), already the Next.js default for
     `next/image`. Native binaries; need to make sure they're present in
     the Alpine container. Strong default.
  2. Pure JS like `@jsquash/jpeg` — no native deps, slower, more
     boilerplate.
  3. Pipe to ImageMagick / `vips` CLI in the container. Avoids npm dep
     but adds an apt/apk install layer.
  Lean (1). If sharp's prebuilt binaries don't land cleanly on `node:24-alpine`,
  switch to `node:24-slim` (Debian) and move on.
- **`next/image`?** Tempting to delete this todo and just use
  `next/image` on the card — it generates derivatives on demand via
  Vercel's image API. But this app runs in a homelab container, not
  on Vercel, so `next/image`'s loader has to be configured to use the
  built-in optimizer (which spawns sharp at request time, no caching
  unless we add it). At that point we're back to writing our own
  cache — might as well bake the thumbnail at upload time when we
  already have the bytes in hand.
- **Backfill.** Existing knives uploaded before this todo lands have no
  thumbnail. Either:
  1. One-shot script that walks `$DATA_DIR/images/**` and generates
     missing thumbs. Run once after deploy.
  2. Lazy generation: image endpoint generates and caches the thumb on
     first request if it's missing. Smells nice but adds latency to the
     first card view per cold image.
  Probably (1) — small dataset, easy to predict behavior.
- **Filename collisions.** What if someone uploads `foo.thumb.jpg`?
  Reserve the `.thumb.` infix in the upload validator (`saveKnifeImage`
  rejects filenames containing `.thumb.`). Document in `docs/data-model.md`.

## Notes for whoever picks this up

- `src/lib/storage/types.ts` `Storage` interface gains a
  `readKnifeImageThumb(knifeId, filename)` method (or just extend
  `readKnifeImage` with a size argument). Implement on `MarkdownStorage`.
  Don't branch on implementation elsewhere (ADR-0004).
- Update `KnifeImage` schema only if the thumb's existence needs to be
  represented in frontmatter. Probably not — derive from disk.
- Update `docs/api.md` and the `/api/docs` endpoint (ADR-0009) when the
  `?size=thumb` query param ships.
- Don't add backwards compatibility: an old `MarkdownStorage` that
  doesn't know about thumbs is fine — the endpoint can fall back to
  the original if the thumb is missing. Once the backfill script runs,
  every image has a thumb.
- ADR-0006 still applies: writes go through the API, not the
  filesystem. Backfill script is a separate one-shot tool, not part of
  the running app.
