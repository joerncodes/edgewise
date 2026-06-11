---
filetype: todo
status: open
---

# Dedicated /on-loan list page

The `onLoan` flag lights up a badge on cards and a filter in the
sidebar (see [[DONE-on-loan]]). That's enough to *find* on-loan
knives once you remember to filter — but it's not surfaced anywhere
on its own. Promote it to a first-class list page so the answer to
"what's currently in my house that isn't mine" is one click away.

## What we want

- `/on-loan` route — same shape as `/backlog`: list of knives
  filtered to `onLoan: true`, with the existing card/table toggle
  and a search box.
- Nav entry next to `Backlog` in the top bar (`src/app/layout.tsx`).
  Use the `Handshake` icon to stay consistent with the badge and
  filter checkbox.
- A small counter on the homepage hero block, mirroring the
  "X knives in the backlog" card — so you see at a glance how many
  are on loan right now. Link to `/on-loan`.

## Where to look

- **`src/app/backlog/page.tsx`** — the closest precedent. Same
  pattern (list filtered by a boolean, with `KnifeFilters` and
  `KnivesView`). `/on-loan` should *not* inherit the drag-and-drop
  manual ordering — on-loan isn't a queue, there's no meaningful
  position. Sort by owner or by `createdAt` desc.
- **`src/app/page.tsx`** — the backlog hero card is the template
  for the on-loan counter.
- **`src/app/layout.tsx`** — add the nav link alongside Backlog /
  Stats / Diary. Mind the gated-nav rule from [[DONE-auth-hardening]]:
  it sits inside the `{signedIn && …}` block.
- **`src/components/knife-filters.tsx`** — the "On loan only"
  checkbox already exists, but on `/on-loan` it's redundant (every
  visible knife is on loan). Pass `onOnLoanOnlyChange={undefined}`
  to hide it on that page.

## Open questions

- **What should the filter sidebar show on /on-loan?** Probably the
  full faceted sidebar (owner, manufacturer, type, steel) but
  *without* the on-loan toggle. Same as how `/backlog` lets you
  narrow by owner — useful when you've got several on-loan knives
  from different people.
- **Empty state copy.** Backlog uses "Inbox zero" — for on-loan,
  something like "Nothing on loan" with a hint about how to flag
  one (PATCH or the toggle button on a knife's detail page).
- **Sort default.** Probably owner A–Z (you remember "Thomas dropped
  off two things" better than dates). Confirm in use.

## Out of scope

- Loan dates (`loanedOn` / `returnBy`) — still out, see
  [[DONE-on-loan]].
- A "return all from owner X" bulk action — premature; flag knives
  one at a time.
- Showing on-loan knives on the owner's page differently — the
  badge already shows it, no special treatment needed.

## Related

- [[DONE-on-loan]] — the underlying flag and existing surfacing.
- `docs/data-model.md` — `onLoan` field.
- ADR-0006 — API-only CRUD. The page is read-only; the toggle on
  the detail page stays the write surface.
