---
filetype: todo
status: open
---

# List page for knife types + capitalized, linked type labels

A `/types` page that lists every knife type that appears across all
knives, plus a display change: type labels render capitalized and link to
the corresponding type page.

## What we want

- `/types` lists every distinct `Knife.type` string in use, with a count,
  linking through to a view of those knives.
- Type values display **capitalized** in the UI — e.g. `Santoku`, not
  `santoku`; `Chef's Knife`, not `chef's knife`. The on-disk value stays
  as the owner typed it (free-form string); capitalization is purely a
  display concern.
- Anywhere a type appears (knife card, knife detail page, future filter
  chips), it's a **link** to its page — e.g. clicking `Santoku` on a card
  jumps to `/types/santoku`.

## Open questions

- **First-class entity, or derived view?** Same call as
  [[manufacturers]] — start fully derived from `Knife.type` frontmatter
  strings. No new storage, no new API. Promote later if it earns it.
- **Capitalization rule.** Either:
  1. **Title Case each word.** Simple, gets `Chef'S Knife` wrong without
     a small fix (don't capitalize after an apostrophe inside a word).
  2. **Capitalize first letter of each word, lowercase rest.** Same
     trap.
  3. **Maintain a small canonical list** (`santoku → Santoku`,
     `chef's knife → Chef's Knife`, etc.) and fall back to title case
     for unknowns. Most robust.
  Lean (3); the list is tiny right now.
- **Slug for the type URL.** `slugify(type)` from `src/lib/storage/ids.ts`
  is the obvious choice — `Chef's Knife` → `chefs-knife`. Same slug rule
  the rest of the app uses, so no new code.
- **Where does the nav link live?** Same concern as
  [[manufacturers]]: the header gets cluttered. Both could go behind a
  single "Browse" entry if it adds up to >2 links.

## Notes for whoever picks this up

- ADR-0006 still applies: read-only page, no inline editing.
- Sort default: by count descending, tiebreak by display name.
- Empty state: "No types yet — add `type:` to a knife's frontmatter via
  the API."
- The capitalization rule needs a single helper (e.g.
  `displayType(raw: string): string`) so the home page card, the detail
  page, and the `/types` list all stay consistent. Put it next to
  `slugify()` in `src/lib/storage/ids.ts` or its own
  `src/lib/display.ts` — don't sprinkle.
- Linkifying the type on the home-page card means the card's outer
  `<Link>` needs to give way around that span (nested anchors aren't
  allowed). Either lift the inner click via `stopPropagation`, or
  restructure the card so the title is the navigation target and the
  meta row is plain spans with their own links.
- The existing data uses lowercase free-form values (`santoku`,
  `cleaver`, `chef's knife`). The Obsidian source notes the user is
  importing from use wikilinks like `[[Chef's Knife]]` and
  `[[Cleaver]]` — keep the API/storage value lowercased & free-form for
  now; the canonical display list does the prettifying.
