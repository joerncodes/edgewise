---
filetype: todo
status: done
---

# Flag knives that are on loan

**Done.** Shipped as proposed:

- Added optional `onLoan: boolean` to `KnifeSchema` (defaults to `false`);
  serialises into existing markdown frontmatter automatically.
- `POST /api/knives` and `PATCH /api/knives/{id}` accept and persist
  the flag. `docs/data-model.md` and `docs/api.md` updated.
- `KnifeCard` renders a small `Handshake` "On loan" badge next to the
  title when the flag is set.
- `KnifeFilters` grew an optional `onLoanOnly` checkbox at the top of
  the sidebar (with a count and a `Handshake` icon). Hooked up on
  both `/` and `/backlog`. The boolean state lives next to
  `FilterState` rather than inside it — the existing facet model is
  value-set-based, and a single boolean didn't justify reshaping it.

Out-of-scope items in the original todo (loan dates, lenders entity,
dedicated `/on-loan` page) remain out of scope; revisit if needed.

---


Some knives in the collection are not mine — they belong to a friend
or coworker but are currently sitting in my house (borrowed to try, on
extended loan, etc.). I want to mark these so I can tell at a glance
which knives are physically here but not mine to keep.

This is distinct from the existing `ownerId` foreign key: every knife
already has an owner. "On loan" is the orthogonal axis — *where the
knife is right now*, not *who owns it*.

## What we want

- A way to mark a knife as `onLoan: true` (it's in my house, not mine).
- A way to see all on-loan knives at a glance — either a filter, a
  badge on the cards/table view, or a dedicated `/on-loan` page (TBD;
  see open questions).
- Mutation through the existing API, not the UI (per ADR-0006).

## Data shape (proposed)

Add an optional boolean to the knife frontmatter:

| field    | type    | required | notes                                |
|----------|---------|----------|--------------------------------------|
| `onLoan` | boolean | no       | true when physically here but not mine |

Absent or `false` → not on loan (the default for everything that
already exists). Zod schema gets an optional `onLoan: z.boolean().optional()`.
No migration needed — additive.

`onLoan` is set/cleared via `PATCH /api/knives/{id}`, same way
`backlog` works today.

## Open questions

- **Surfacing.** Filter checkbox on `/` and `/backlog` (cheap, fits the
  existing faceted-filter sidebar), badge on the knife card (visual
  cue), or a dedicated `/on-loan` page? Probably "badge + filter" for
  v1, page only if the list grows.
- **Backlog interaction.** An on-loan knife can still be in the
  backlog (it's here, it can be sharpened). The two flags are
  independent. Make sure the backlog page doesn't accidentally hide
  on-loan knives.
- **Owner semantics.** `ownerId` should keep pointing at the real
  owner — *don't* invent a synthetic "self" owner just to model this.
  The user is the implicit operator, not an entity in the data.
- **"Mine" knives.** This todo doesn't introduce a concept of
  knives-I-own. If we ever want that, it's a separate flag
  (`mine: true`) or a designated owner ID — out of scope here.

## Where to look

- `src/lib/schema.ts` (Zod) — add `onLoan` to the knife schema.
- `docs/data-model.md` — document the new field alongside `backlog`.
- `docs/api.md` — note that PATCH accepts `onLoan`.
- `src/components/knife-card.tsx` / list views — render a small
  badge ("on loan") when the flag is set. Match the existing badge
  styling rather than inventing a new one.
- `src/components/filters/*` (or wherever the faceted sidebar lives)
  — add an `On loan` filter checkbox.

## Out of scope

- Tracking *when* it came on loan or *when it goes back* — if that
  matters later, it's a separate `loanedOn` / `returnBy` pair, not
  this todo.
- A separate "borrowers" or "lenders" entity — `ownerId` already
  identifies who it belongs to.

## Related

- `backlog`, `backlogPosition` — the existing precedent for an
  orthogonal status flag on a knife.
- ADR-0006 — API-only CRUD, no UI write flows.
