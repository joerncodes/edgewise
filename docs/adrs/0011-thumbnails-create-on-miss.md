---
filetype: adr
id: "0011"
title: Thumbnails are generated on first read when missing
status: accepted
date: 2026-06-09
supersedes: "0010"
---

# Context

ADR-0010 picked "backfill only — no create-on-miss" for the thumbnail
cache, arguing that a GET should not mutate disk. After living with it
briefly: the operational tax of remembering to run
`pnpm backfill:thumbs` on every deploy outweighs the conceptual
cleanliness. On a fresh container, the home page silently serves full-
resolution originals until somebody notices and runs the script. The
read-path fallback that was meant to be a safety net became the actual
behaviour.

For a single-user homelab app the trade-off looks different than it
would for a multi-tenant service:

- There is exactly one writer, so concurrent first-readers of the same
  missing thumb aren't a meaningful race.
- A first-read latency hit (sharp resize of one image) is fine; nobody
  is hammering a single endpoint.
- The disk write is idempotent — same source → same output. Re-running
  is harmless.

# Decision

`readKnifeImage(knifeId, filename, "thumb")` generates the thumbnail
on demand when the cached `.thumb.jpg` is missing:

1. Try to read the cached thumb. If it exists, return it.
2. Otherwise, read the original. If the original is missing, return
   `null` (404).
3. Pipe the original through `makeThumbnail()`, write the result to
   the cache path, and return the bytes.
4. If thumb generation itself fails (corrupt source, etc.), fall back
   to returning the original bytes. The handler still serves something
   reasonable; the home page just bleeds a bit of bandwidth until the
   image is replaced.

The `scripts/backfill-thumbs.mjs` script stays — it's now a *warm-the-
cache* tool, useful right after a deploy if you want the first page
load to be fast, but no longer required for correctness.

# Consequences

- Fresh deployments self-heal: the first user request for each card
  pays the sharp cost (~100ms per image), subsequent requests are
  cached. By the second page load, everything is fast.
- GET handlers now perform writes. That violates the "reads don't
  mutate" instinct, but the mutation is a cache fill — observably
  pure from a client's perspective, and the data on disk converges to
  the same state regardless of access pattern.
- Two simultaneous first-readers of the same missing thumb will both
  regenerate. The writes are idempotent (`fs.writeFile` clobbers) so
  the outcome is correct; the only cost is one wasted sharp call.
  Acceptable at single-user scale; revisit with a lockfile or
  per-path mutex if this app ever gets concurrent traffic.
- The backfill script is now optional. Keep it in the repo — it's a
  useful one-shot for "warm the entire cache after a thumb-parameter
  change" or "regenerate everything after wiping `.thumb.jpg`".
- Documentation that previously told operators to run the backfill
  after every deploy is wrong now. Update `docs/deployment.md` and
  any todo notes.

# Alternatives considered

- **Stay with backfill-only (ADR-0010).** Cleaner in principle, but
  fails in practice every time someone forgets the post-deploy step.
- **Generate on upload + a periodic sweep.** Periodic adds a moving
  part (cron, queue) for what is fundamentally a tiny dataset. Not
  worth it.
- **Reject reads of missing thumbs with a 404.** Forces the client to
  fall back to the original URL — moves the fallback from the storage
  layer into every caller. Worse.

# How to apply

The implementation lives in `MarkdownStorage.readKnifeImage`:

```ts
async readKnifeImage(id, filename, size = "original") {
  if (size === "thumb") {
    const cached = await tryRead(thumbPath);
    if (cached) return { bytes: cached, contentType: THUMB_MIME };

    const original = await tryRead(originalPath);
    if (!original) return null;

    try {
      const generated = await makeThumbnail(original);
      await fs.writeFile(thumbPath, generated); // fire-and-forget on failure
      return { bytes: generated, contentType: THUMB_MIME };
    } catch {
      // fall through to serving the original
    }
  }
  // …existing original-read path
}
```

Concretely: the `readKnifeImage` thumb branch in
`src/lib/storage/markdown.ts` becomes a write-through cache. Tests, if
any are added later, should cover the happy path, the missing-original
path, and the corrupt-source path (thumb generation throws → fall back
to original).
