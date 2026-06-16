---
filetype: todo
status: open
---

# Edit and delete knives from the detail page

The detail page renders every frontmatter field but offers no way
to change anything. Misclassified type? Typo in the name? Wrong
manufacturer? All of it requires a `PATCH /api/knives/{id}` curl
right now. Inline-edit it on the detail page.

## What we want

- A pencil button in the detail header that toggles the property
  list into an editable form. Same field set as
  [[ui-knife-create]] minus `id` (already set). Save → `PATCH` →
  refetch and exit edit mode. Cancel → discard local state.
- A delete button (in an "actions" submenu, not next to "save") that
  opens an `AlertDialog`. Confirmation removes the knife, all its
  sessions, and the images directory (server already handles the
  cascade in `MarkdownStorage.deleteKnife`). Redirect to `/` with a
  toast.
- The backlog/onLoan toggle buttons stay where they are — they're
  already operational and don't need to live behind edit mode.

## Open questions

- **Inline vs modal.** Inline keeps the photo + history visible
  while editing, which matters when you're looking at the knife
  to remember which one this is. Picked inline per the
  [[ui-crud-foundation]] convention.
- **Granular vs full-form edit.** Two extremes:
  1. Click any property row to edit just that field, save on blur.
     Slick but lots of UI plumbing and N round trips.
  2. One "Edit" button → full form → one save. Boring but
     consistent with the create flow and one round trip.
  (2) wins for v1. Revisit if (2) feels heavy in practice.
- **Slug rename.** Renaming a knife doesn't change its `id`
  (filename + URL stay stable). Show this in the form as a small
  helper ("URL stays `wuesthof-classic-8`"). If the user really
  wants a new slug, they can delete + recreate.
- **Delete cascade visibility.** The dialog should spell out what
  gets removed: "Deletes the knife, N sessions, and M photos.
  Cannot be undone." For a knife with sessions/photos count > 0,
  add a typed-confirmation field ("type `delete` to confirm") so
  a stray Enter can't blow up months of records.
- **Session edits** — already mutable via API per
  [[DONE-session-edit]]. UI surfaced in [[ui-session-form]], NOT
  here. Keep this todo focused on the knife frontmatter.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — the property list + header
  that grow the edit/delete affordances. The existing
  `toggleBacklog` / `toggleOnLoan` patterns show the shape for
  optimistic-ish PATCH calls.
- **`src/app/api/knives/[id]/route.ts`** — PATCH and DELETE
  already do the right thing.
- **`src/components/ui/alert-dialog.tsx`** — needs to be added
  via shadcn (see [[ui-crud-foundation]]).

## Out of scope

- Bulk edit ("set type Western on all Chef's Knives"). Premature.
- Edit history / undo. The markdown file is in git on the host;
  that's the audit log.
- Reassigning sessions to a different knife. Edge case; delete +
  re-add covers it.

## Related

- [[ui-crud-foundation]] — pattern source.
- [[ui-knife-create]] — sibling flow; the same form layout
  applies.
- [[ui-session-form]] — sessions are a separate concern even
  though they live inside the knife file.
- [[DONE-session-edit]] — the underlying API for session
  mutation.
