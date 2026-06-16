---
filetype: todo
status: done
---

# UI CRUD foundation — patterns and conventions

ADR-0006 keeps the UI read-only and routes every write through
`/api/*`. That was a good v1 call: one validation layer, one auth
boundary, one shape to reason about. But day-to-day operation now
means switching to a terminal and curling JSON every time a knife
shows up. Time to grow UI write flows.

This todo is **not** the implementation — it's the foundation. It
locks down the cross-cutting decisions so every subsequent CRUD
todo (knife create, owner CRUD, image upload, …) can lean on a
shared pattern instead of re-deciding from scratch.

## What we want

- An ADR superseding the "UI is read-only" stance of ADR-0006,
  while preserving the rest of it: still no Server Actions, still
  one Zod source of truth, still `/api/*` as the public contract.
- A single form pattern reused across every entity. Validation
  reuses the existing `*InputSchema` Zod definitions — no parallel
  client-side schema.
- A convention for "where do forms live": modal, dedicated page,
  or inline-on-detail. Pick one default per shape (create vs
  edit) and stick to it.
- A convention for destructive operations: shadcn-style
  `AlertDialog` confirmation, no native `confirm()`.
- A convention for feedback: `sonner` toast on success/error
  (already wired in `src/app/layout.tsx`).
- A small `useEntity` / `useMutation`-shaped hook (or just inline
  patterns) for: pending state, optimistic-or-not, refetch after
  mutation. Whatever it is, document it once.

## Open questions

- **Form library.** Options:
  1. **react-hook-form + @hookform/resolvers + zod.** Battle-tested,
     plays well with shadcn's `Form` primitives, free integration
     with the existing `*InputSchema` definitions. New dep, but
     it's the dep the ecosystem reaches for.
  2. **Hand-rolled with `useState` + a small `parseInput()` helper
     that runs the existing Zod schema.** Zero new deps. Fine for
     small forms (Owner, Steel, Handle); painful for the big knife
     form with its 10+ fields and the session list and the images.
  Lean toward (1) — the knife form is the load-bearing case and the
  same pattern downscales cleanly to the small entities.
- **Modal vs page vs inline.** Proposed default:
  - **Create** → dedicated page (`/knives/new`, `/owners/new`).
    Survives reloads, deep-linkable, simple navigation back to the
    list via `<- All knives`. Mirrors the read-only detail pages.
  - **Edit** → inline on the detail page, toggled by a pencil
    button. Keeps the context visible (you see what you're
    editing) and avoids modal-state plumbing. Save → revalidate
    detail; cancel → discard local state.
  - **Delete** → `AlertDialog` from the detail page, with a typed
    confirmation only for high-stakes ones (delete owner with N
    knives still attached). Knife/steel/handle delete is one
    button + dialog.
- **Optimistic updates.** Default to *no*: the API responds with
  the full entity, refetch is cheap (one markdown file), and the
  toast already tells the user it worked. Reserve optimistic for
  ops that feel laggy — backlog reorder is the existing precedent.
- **Where the freeform-string fields autocomplete from.** Type,
  subtype, manufacturer, steel string, handle string, abrasive
  type — all open lists. The form should pull observed values
  from the existing `/api/facets` endpoint and surface them as
  combobox suggestions. New values still allowed (open list); the
  combobox just nudges toward consistency. Reuses the cross-narrow
  pattern from the sidebar filters.
- **Markdown notes.** The body field on every entity is markdown.
  Render uses `react-markdown`; input is a plain `<Textarea>` for
  now. A live preview tab is nice-to-have — not blocking.
- **Slug derivation visibility.** `slugify(name)` runs server-side
  on create. The form could surface the derived ID as a read-only
  hint ("Will be saved as `wuesthof-classic-8`"), helpful when a
  custom `id` is desired (override field). Default: hide; add
  override later if it becomes annoying.
- **Auth on writes.** Browser session already gates `/api/*`
  through the Auth.js cookie path; nothing new needed. Bearer is
  still the API-client path. Per [[DONE-auth-hardening]] the cookie
  isn't a CSRF concern because the Auth.js JWT mechanism + the
  same-origin nature of these requests covers it.

## Where to look

- **`docs/adrs/0006-api-only-crud.md`** — mark `superseded` and
  add a `superseded-by` field pointing at the new ADR. Keep the
  rest of its intent (no Server Actions, single validation layer).
- **`src/lib/api-client.ts`** — already has `createKnife`,
  `updateKnife`, `deleteKnife`, and the analogues for every
  entity. The hook layer wraps these.
- **`src/lib/storage/types.ts`** — `*InputSchema` is what the
  form validates against. Don't duplicate it.
- **`src/components/ui/`** — shadcn primitives. `Form` /
  `AlertDialog` / `Combobox` need to be added with
  `pnpm dlx shadcn@latest add form alert-dialog command popover`.

## Out of scope

- Specific entity flows (those get their own todos:
  [[ui-knife-create]], [[ui-knife-edit-delete]],
  [[ui-session-form]], [[ui-image-upload]], [[ui-owner-crud]],
  [[ui-library-crud]]).
- A separate authoring UI for the markdown body (no live preview,
  no toolbar). Plain textarea is fine; revisit if it grates.
- Server Actions. Explicitly not adopting them — the API stays
  the single write path so external clients (curl, scripts,
  Claude) and the UI share the contract.

## Related

- ADR-0006 — the read-only stance this supersedes.
- [[DONE-session-edit]] — the API surface for session
  PATCH/DELETE; the UI side lands in [[ui-session-form]].
- [[DONE-distinct-values-api]] — the facets endpoint that powers
  combobox autocomplete on the open-list string fields.
