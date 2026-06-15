---
filetype: todo
status: open
---

# JSON export and import

The disk is the source of truth. The container runs on a homelab
Portainer instance. If that volume disappears so does every
session ever recorded. There's no migration tooling and no second
copy.

A trivial export/import pair would give honest disaster recovery
without any new infrastructure — pull a JSON dump on a cron, stash
it in S3 / a NAS / next to the daily notes vault, and on a bad day
re-import it into a fresh container.

## What we want

- `GET /api/export` — a single JSON document containing every
  knife, owner, steel, handle, abrasive, and image metadata
  reference, in a stable shape. ISO timestamps preserved.
  Returns `application/json; charset=utf-8`. Probably gzipped at
  the reverse-proxy layer, no need to do it in-app.
- `POST /api/import` — accepts the same shape. Either
  - **replace mode**: wipes the data dir first, writes the
    payload. Used for disaster recovery into an empty volume.
  - **merge mode**: upserts by ID, skipping conflicts. Used for
    syncing between two installs.
  - Start with replace mode only; merge is more design work and
    only useful if multi-installation ever happens.
- Image bytes are *not* in the JSON. Either:
  - Document that `images/` needs a separate rsync alongside the
    JSON dump (simple, fits the existing
    [[reference_edgewise_api]] rsync workflow), OR
  - Bundle as a tarball: `GET /api/export?bundle=tar` returns
    `application/x-tar` with the JSON plus the images directory.
    Heavier to implement. Defer until the simpler path proves
    annoying.

## Where to look

- **`src/app/api/`** — new `export/route.ts` and `import/route.ts`.
  Use the `getStorage()` seam: `storage.listKnives()`,
  `listOwners()`, etc. for export; `saveKnife` / `saveOwner` /
  etc. for import.
- **`src/lib/storage/types.ts`** — the export shape is just the
  Zod types in an envelope (`{ version: 1, exportedAt: ISO,
  knives, owners, steels, handles, abrasives }`). Carry a
  `version` field so future shape changes can be detected on
  import.
- **`docs/api.md`** — document both endpoints. They're new public
  API surface.
- **`src/lib/storage/markdown.ts`** — the implementation that has
  to round-trip cleanly. Worth a unit-test-shaped check that
  `import(export(data)) === data` semantically before relying on
  it.

## Open questions

- **Auth.** Bearer-token only, like the rest of the API. Import
  in particular is dangerous — explicit token + maybe a
  `?confirm=replace` query param so a curl typo can't blow away
  the corpus.
- **Validation on import.** Reject the whole payload if any
  knife references an unknown `ownerId`, etc. The point of the
  feature is "trustworthy restore," not "best-effort."
- **Backup automation.** Out of scope for the endpoint, but a
  note in `docs/deployment.md` showing the cron snippet
  (`curl … > /backup/edgewise-$(date +%F).json`) makes the
  feature actually used.

## Out of scope

- A versioned migration system. The single export-version field
  is enough.
- Differential/incremental exports. Full dump is small enough.
- Restoring just one entity ("import this one knife"). The
  filesystem is already that interface — edit the markdown.

## Related

- [[reference_edgewise_api]] — the rsync-based prod migration
  pattern this complements.
- `docs/deployment.md` — where the cron snippet should land.
- ADR-0006 — API-only CRUD; this is consistent.
