---
filetype: adr
id: "0010"
title: Thumbnails are backfilled, never generated on a missed read
status: superseded
supersededBy: "0011"
date: 2026-06-09
---

> **Superseded by [ADR-0011](0011-thumbnails-create-on-miss.md).** The
> operational ergonomics of "remember to run the backfill on every
> deploy" turned out worse than the cost of generating on first read.
> See ADR-0011 for the replacement.


# Context

The card-grid pages render a 3:1 cover of each knife. Until now they
served the full-resolution upload, which is multiple megabytes per
card. Per `docs/todos/thumbnails.md`, the storage layer now writes a
600×200 JPEG thumb next to every newly uploaded image.

The remaining design question was how to populate thumbs for images
uploaded before this change shipped. Two patterns:

1. **Backfill.** A one-shot script walks `$DATA_DIR/images/**` and
   generates any missing `.thumb.jpg`. Run once after deploy.
2. **Lazy / create-on-miss.** The image endpoint detects a missing
   thumb on a `?size=thumb` request, generates it, writes it, and
   serves it.

# Decision

Backfill only — `scripts/backfill-thumbs.mjs`, invoked via
`pnpm backfill:thumbs`. Image reads with `?size=thumb` that find no
thumb on disk silently fall back to the original; they do **not**
generate one at request time.

The read-path fallback exists so that broken or never-backfilled
deployments degrade gracefully (you serve a bigger image, but nothing
404s). It is not a feature — it is a safety net, and shipping a knife
without a thumb is an operational mistake to be fixed by re-running
the backfill.

# Consequences

- The request path is purely read-only. No write-side effects from a
  GET, no lock or race between concurrent first-readers of the same
  image, no surprising disk writes from a request handler.
- Cold deploys against existing data need the operator to remember to
  run the backfill. If they don't, the home page works but bleeds
  bandwidth until they notice.
- The backfill is idempotent — it skips any image that already has a
  thumb — so running it twice is safe.
- Re-running the backfill after upgrading sharp / changing the thumb
  parameters does **not** regenerate existing thumbs. If we ever change
  THUMB_WIDTH / HEIGHT / QUALITY in a way that should reflow the
  cache, the operator must wipe the `.thumb.jpg` files first. Document
  if/when that becomes a concern.

# Alternatives considered

- **Lazy create-on-miss.** Tempting because deployments self-heal, but
  it puts an unbounded write-on-read into the API surface — bad for
  reasoning about behaviour, bad for caches and load testing. Also
  surprising: a `GET` that mutates the disk is the kind of thing you
  forget about until it bites someone debugging.
- **Generate on upload only, no backfill at all.** Leaves existing
  data permanently unthumbed. Fine if you're starting from zero, but
  this app already has a corpus.
- **Regenerate every thumb at startup.** Slow, surprising, and would
  silently undo any manual edits the operator made to a thumb (not
  that they should).

# How to apply

When deploying this change to an instance with existing image data:

1. Bring up the new container.
2. Inside it (or via a one-shot job mounted on the same `/data`
   volume), run `pnpm backfill:thumbs`.
3. Confirm `data/images/<knifeId>/<file>.thumb.jpg` exists alongside
   each `<file>.<ext>`.

If you later change the thumb dimensions or quality in
`src/lib/storage/markdown.ts`, also delete the existing `.thumb.jpg`
files before re-running the backfill — see "Consequences" above.
