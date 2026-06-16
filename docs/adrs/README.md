---
filetype: adr-index
---

# Architecture Decision Records

Short notes capturing why the app is shaped the way it is. New decisions go
in a new file — old ones get a status change (`accepted` → `superseded`) and
a pointer to the replacement, rather than being edited in place.

| #    | Decision                                                      | Status   |
|------|---------------------------------------------------------------|----------|
| 0001 | [Next.js + App Router](0001-nextjs-app-router.md)             | accepted |
| 0002 | [shadcn/ui](0002-shadcn-ui.md)                                | accepted |
| 0003 | [Markdown files on disk](0003-markdown-storage.md)            | accepted |
| 0004 | [Storage abstraction as the only seam](0004-storage-interface-seam.md) | accepted |
| 0005 | [Auth.js with single env-var user](0005-authjs-single-env-user.md) | accepted |
| 0006 | [All CRUD via API, UI read-only](0006-api-only-crud.md)       | superseded by 0013 |
| 0007 | [Per-session angle](0007-per-session-angle.md)                | accepted |
| 0008 | [Portainer + /data bind mount](0008-portainer-bind-mount.md)  | accepted |
| 0009 | [Self-describing API endpoint for LLMs](0009-self-describing-api-endpoint.md) | accepted |
| 0010 | [Thumbnails backfilled, no create-on-miss](0010-thumbnails-backfilled-no-create-on-miss.md) | superseded by 0011 |
| 0011 | [Thumbnails generated on first read](0011-thumbnails-create-on-miss.md) | accepted |
| 0012 | [Homepage hero only renders in cards view](0012-hero-only-in-cards-view.md) | accepted |
| 0013 | [UI write flows via /api/*](0013-ui-write-flows-via-api.md)   | accepted |
