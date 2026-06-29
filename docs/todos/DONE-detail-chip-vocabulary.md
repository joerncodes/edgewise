---
filetype: todo
status: done
---

# Unify the metadata vocabulary on the detail page

The same dataset — type, subtype, manufacturer, steel, handle — gets
two completely different treatments depending on the page:

- On the **card** (`knife-card.tsx`): color-coded chips. Brass for
  manufacturer, steel-tone for type/subtype, neutral mono for steel
  and handle. Distinctive, scannable, on-brand.
- On the **detail page** (`DetailBody` → `PropertyList`): a flat gray
  ledger — muted `w-36` label, tiny icon, plain text link per row.
  Reads like a generic admin spec sheet.

Two vocabularies for one dataset is an inconsistency, and the weaker
one is winning on the more important page. The chip vocabulary should
carry over to the detail page.

## What we want

- Render type/manufacturer/steel/handle on `/knives/[id]` using the
  **same chip components** the card uses, not gray property rows.
- Reserve the `PropertyList` for facts that are genuinely tabular and
  don't belong as chips (if any remain after [[DONE-detail-dedupe-facts]]).
  Don't keep both treatments for the same fields.
- Extract the chip markup so the card and detail page share it rather
  than diverging again later. Right now the chips are inline JSX in
  `knife-card.tsx`; a small `MetaChips`/`KnifeChips` component keeps
  them in sync.

## Where to look

- **`src/components/knife-card.tsx`** (`~:146`) — the chip row is the
  source of truth for colors and shapes. Lift it into a shared
  component.
- **`src/app/knives/[id]/page.tsx`** — `DetailBody`'s `PropertyList`
  (`~:480`). Replace the type/manufacturer/steel/handle rows with the
  shared chips.
- **`src/components/property-row.tsx`** — stays for whatever is left
  that's truly a label/value pair.

## Related

- [[DONE-detail-bevel-hero]] — same root cause: the detail page underuses
  the vocabulary the card already established.
- [[DONE-detail-dedupe-facts]] — decide what (if anything) the property
  list still owns once chips take over.
