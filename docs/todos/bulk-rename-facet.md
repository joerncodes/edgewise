---
filetype: todo
status: open
---

# Bulk rename a facet value across knives

Types and manufacturers don't have backing entity records — they're
derived from observed `knife.type` / `knife.manufacturer` strings.
That's fine for browsing, but it leaves no single place to fix a
drift: when "Pocket Knife" and "pocket" both exist (or "Santoku" and
"santoku"), today the only fix is to PATCH each knife by hand. The
fix-it-once cost is high enough that the drift just stays.

Same problem on `steel` and `handle` strings — they're soft-FK
references; renaming the `Steel` record doesn't rewrite the strings
on knives that reference it (see [[ui-library-crud]]).

Promote a single "bulk rename" action that rewrites the string
across every knife that matches.

## What we want

- A small "Rename" affordance on the `/types/<slug>`,
  `/manufacturers/<slug>`, `/steels/<slug>`, `/handles/<slug>` and
  `/types/<slug>?subtype=…` pages. Opens an inline form or modal
  with the new value and an impact preview ("rewrites N knives").
- Submit → loop the knives that match (by slug, case-insensitive)
  and PATCH each with the new string. Show progress for >5 knives.
  Success → toast + navigate to the new slug.
- An `AlertDialog` confirmation when N is large (say > 10) — same
  shape as the knife-delete typed-`rename` guard, so a slip can't
  rewrite the whole corpus.

## Open questions

- **Client-side loop vs. server-side bulk endpoint.** Two paths:
  1. **Client loop.** N PATCHes from the browser. Reuses the
     existing `PATCH /api/knives/{id}` contract; no new server
     surface. Slow for large N, partial-failure mid-way leaves a
     mixed state.
  2. **Server endpoint.** `POST /api/bulk/rename` with
     `{ field, oldSlug, newValue }`. Atomic per request, faster,
     but new surface and a new shape to document.
  Lean (1) for v1 — the corpus is small (~30 knives) and a client
  loop is the simplest thing that works. Revisit if corpus grows
  or if partial-failure recovery becomes painful.
- **Slug-based vs. exact-string match.** The drift case is exactly
  the slug-equal-but-string-different one (`Santoku` vs `santoku`).
  Match by `slugify()` so both spellings get caught in a single
  rename. Surface the matched strings in the preview so the user
  can see what's getting rewritten.
- **Case mode on the new value.** Some users want
  Title Case ("Pocket Knife"), some want lowercase ("pocket knife").
  Don't try to be clever — accept the typed value as-is and let
  the user pick the form. The slug stays the same regardless.
- **Subtype scope.** Renaming a subtype should only affect knives
  with both the parent type AND the matching subtype. The
  `/types/<slug>?subtype=…` page is the right entry point;
  rename UI on that page operates on the type+subtype tuple.
- **Cross-knife side effects.** A bulk rename can shift counts on
  related facet pages. After rename, redirect to the new slug so
  the URL doesn't 404. Worth keeping the rename history? Probably
  not — the git history on the markdown files is the audit trail.
- **Steel/handle "promote to library."** Adjacent feature deferred
  in [[DONE-ui-library-crud]] — when no record exists for a
  steel/handle string, surface a "Create steel record" CTA. Could
  live alongside rename. Distinct todo; mentioned here only so
  it doesn't get forgotten.

## Where to look

- **`src/lib/storage/ids.ts`** — `slugify()` is the match function.
- **`src/lib/facets.ts`** — the existing tally pattern shows
  case-insensitive grouping; the rename preview reuses it.
- **`src/app/{types,manufacturers,steels,handles}/[slug]/page.tsx`** —
  the entry points. Each grows a Rename button next to Add notes /
  Edit / Delete.
- **`src/lib/api-client.ts`** — `updateKnife(id, { field: value })`
  already covers the per-knife PATCH; no new helper needed for v1.
- **`docs/data-model.md`** — soft-FK reference rules; rename
  behaviour belongs in the same paragraph.

## Out of scope

- Audit trail / undo. The git history on disk is the record.
- Cross-type rename ("merge `Santoku` into `Chef's Knife`"). That's
  a different shape — the new value already exists, the merge
  semantics need their own thinking. Defer.
- Bulk rename for `subtype` divorced from `type`. The subtype
  always lives under a type in the UI; rename in that context.

## Related

- [[DONE-ui-library-crud]] — established the soft-FK string
  semantics for steel/handle; the rename action makes those
  references mass-fixable.
- [[DONE-knife-subtypes]] — open-list shape that introduced the
  Santoku/santoku drift hazard.
- `docs/data-model.md` — referential rules for the soft-FK fields.
