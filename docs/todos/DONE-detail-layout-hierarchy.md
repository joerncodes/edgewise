---
filetype: todo
status: done
---

# Fix the detail page's top-of-page order and spacing rhythm

Two layout problems on `/knives/[id]`:

**1. The hero image lands before any context.** The full-width photo
renders *above* the back-link and the knife's name (`~:259`). You
arrive on a contextless image, then scroll past the "All knives"
breadcrumb, then finally reach the title. The title should anchor the
page, or the image and title should be paired — not the photo floating
alone on top.

**2. Everything is equally spaced.** The page is one big
`space-y-12` ribbon (`~:258`), so the bevel/metadata, the gallery,
the sessions, and the notes all sit at identical visual distance. There
is no hierarchy telling the eye which section matters more.

## What we want

- Reorder so the breadcrumb + title (+ owner) come first, and the hero
  image is either paired with the title or sits just below it as a
  deliberate band — not above the breadcrumb.
- Replace the flat `space-y-12` with an intentional rhythm: tighter
  spacing within a section's own block (title/owner/bevel/sparkline),
  larger gaps between the major regions (identity → gallery →
  sessions → notes). Let spacing encode grouping.
- Keep it responsive; the title-first order should also be the mobile
  order.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — the outer
  `<div className="space-y-12">` (`~:258`), the hero `Photo` block
  (`~:259`), and the `header` (`~:268`).
- **`src/app/page.tsx`** — the home header pairs a logo and title
  side by side; a similar paired treatment could work for the detail
  hero image + title.

## Related

- [[DONE-detail-bevel-hero]] — defines what the new top-of-page identity
  block contains, which this todo arranges.
