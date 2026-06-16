---
filetype: todo
status: done
---

# Owner create / edit / delete UI

Owners are foreign-keyed from every knife. Today the only way to
add one is `POST /api/owners` from a terminal. The owners list
and owner detail pages render fine but offer no write actions.

## What we want

- `/owners/new` form with `name` (required), `contact`, `notes`
  (markdown body). Submit → `api.createOwner()` → redirect to
  `/owners/{id}` or back to the `returnTo` query param (so the
  "+ new owner" link from the knife form lands the user where
  they started).
- "Add owner" button on `/owners` next to the list header.
- Edit on `/owners/{id}` — same inline pattern as
  [[ui-knife-edit-delete]]: pencil button, form, save, refetch.
- Delete on `/owners/{id}` — `AlertDialog`. If the owner has
  knives still attached, the server returns 409. The UI should
  pre-check (count `knives.filter(k => k.ownerId === ownerId)`)
  and disable the delete button with a hint: "Reassign or delete
  the N knives first." Don't surprise the user with a 409 toast.

## Open questions

- **Reassign affordance.** If the owner has knives, offer a
  "reassign all to…" action in the delete dialog. Picks another
  owner, PATCHes each knife. Useful when a coworker leaves and
  hands their knives to someone else. Stretch goal — defer if it
  feels heavy.
- **Slug rename on owner edit.** Same as knife: the slug stays
  stable, only the display name changes. Show the slug as a
  helper. If a true rename is needed, the rsync workflow from
  [[reference_edgewise_api]] is still the answer.
- **Contact field shape.** Currently free-form. Some users want
  email, some Slack handle, some phone. Don't try to structure
  it; the markdown body can hold extras.

## Where to look

- **`src/app/owners/page.tsx`** — list page, gets the "Add" CTA.
- **`src/app/owners/[id]/page.tsx`** — detail, gets edit/delete.
- **`src/app/api/owners/route.ts`** + `[id]/route.ts` — already
  shaped right; nothing to change server-side.
- **`src/lib/storage/types.ts`** — `OwnerInputSchema`.

## Out of scope

- Owner avatars / photos. Current model has none and there's no
  ask. Names are enough.
- Per-owner notifications ("knife was sharpened, ping them"). Way
  beyond this scope.
- Reassign-on-delete (deferred — see open question).

## Related

- [[ui-crud-foundation]] — pattern source.
- [[ui-knife-create]] — sibling flow that links here for the "+
  new owner" inline shortcut.
- `docs/data-model.md` — referential integrity (owner-with-knives
  delete returns 409).
