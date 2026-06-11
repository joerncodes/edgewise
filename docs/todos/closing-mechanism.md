---
filetype: todo
status: open
---

# Closing mechanism for pocket knives

Folders aren't all the same. Axis lock, frame lock, liner lock,
slipjoint, button lock, back lock — these matter for feel,
maintenance, and how you use the knife. Right now nothing
captures it.

## What we want

- A `closingMechanism` field on a knife. Open string, free-text,
  same shape as `manufacturer` / `steel` / `handle`.
- Only meaningful for folders. On fixed blades it should sit
  blank and stay out of the way (don't render an empty row).
- Faceted: `/closing-mechanisms/<slug>` index page like
  `/handles/<slug>`, plus a filter dropdown on `/knives`.

Suggested starting values (don't hard-code them — just for the
record):

- axis lock
- frame lock
- liner lock
- slipjoint
- back lock / lockback
- button lock
- compression lock

## Where to look

- **`src/lib/storage/types.ts`** — `KnifeSchema` gains
  `closingMechanism: z.string().optional().default("")`.
- **`src/components/knives-view.tsx`** — new column (off by
  default once column toggle lands per
  [[table-column-toggle]]).
- **`src/app/closing-mechanisms/[slug]/page.tsx`** — copy the
  `/handles/[slug]` page structure.
- **`docs/data-model.md`** — document the new field.

## Depends on / related to

- [[knife-subtypes]] — closing mechanism only makes sense for
  certain subtypes (folder). If subtypes land first, the field's
  visibility rule is cleaner: "show iff subtype === folder".
