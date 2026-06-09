---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Reskin: modern, Notion-ish CRUD aesthetic + dark mode

The current UI is functional but looks like an un-styled shadcn dump. The
goal is something that feels like Notion / Linear / Things 3: roomy, calm,
typography-led, no hard borders everywhere, no zebra striping, no "panel of
cards" feel. It should look like a tool a thoughtful person built for
themselves, not like a CRUD admin.

## Target references

- **Notion** — long-form list views, soft dividers instead of full borders,
  inline-editable properties with quiet labels (`fileClass`, `owner`,
  `lastSharpened` in the screenshot the user pasted earlier).
- **Linear** — dense data lists with subtle hover states, tight typography
  rhythm, no chrome.
- **Things 3** — generous vertical spacing, restrained color, content as
  the figure (not the cards).
- **Vercel dashboard** — modern dark/light theming done right.

## What "modern CRUD" means here

- **Lists are flat, not tables-in-cards.** No outer card around the knives
  list; rows separate with hairlines, hover lifts the row.
- **Detail pages read top-down.** A title, then a sidebar of *properties*
  (label-on-left, value-on-right, ultralight type), then content sections.
  No "Details" / "Sessions" / "Images" h2-headed cards stacked like a form.
- **Typography over chrome.** One serif or rounded-sans display face for
  titles; one neutral sans for body. Numbers tabular. Dates de-emphasized.
- **Quiet color.** Two accents max. No filled badges by default; outlined
  or just-text.
- **Hover and focus carry the affordances.** No buttons where a link works.
  Property rows reveal their actions on hover.
- **Inline editing is OK as a v2.** v1 stays API-driven; the UI just looks
  better while doing the same thing.

## Dark mode

- Real dark mode, not "invert the colors". Background `#0b0b0c`-ish, content
  `#e8e8ea`-ish, never pure black or pure white.
- Toggle in the header. Persist to `localStorage`. Respect
  `prefers-color-scheme` on first load.
- Tailwind v4 + CSS variables make this cheap — define the palette as CSS
  variables, switch via `[data-theme="dark"]` on `<html>`.
- shadcn already supports this; we just have to commit to a palette and
  apply it.

## Concrete UI changes (sketch)

### Header
- Drop the bordered bar. Make it a quiet top strip: wordmark left, two text
  links, theme toggle right. ~48px tall.
- Active nav link is bold, not boxed.

### `/` dashboard
- Lose the stat cards. Replace with a one-line summary
  ("12 knives · 8 owners · 47 sharpenings · last: Guido Kleines Santoku,
  16.07.2025"). Below it, the recent-sharpenings list, flat.

### `/knives`
- Flat row list, not a `<Table>`. Each row:
  `[name] [owner, muted] [type tag, outlined] [last @ angle, muted right]`.
- Hover: light bg, chevron on the right.
- Sort header is text-only ("by name ▾"), opens a dropdown.

### `/knives/[id]`
- Hero: big title, owner one line below as a quiet link.
- Then a property block (the Notion pattern from the user's screenshot):
  ```
  Owner          Guido Göbbels
  Type           santoku
  Last sharpened 16.07.2025 @ 17°
  Sharpenings    1
  ```
- Then **Images** — wide, full-bleed inside content column, no card.
- Then **Sessions** — vertical timeline. Date on the left, angle big,
  notes muted under it. No table.
- Then **Notes** — plain prose block (markdown later?).

### `/owners` and `/owners/[id]`
- Same treatment: flat lists, property block, no boxes.

### Components

- Drop `Card` as a default wrapper. Use it only where it earns its keep
  (e.g. login form).
- Add a `<PropertyRow label value />` primitive — that's the Notion
  pattern and we'll use it everywhere.
- Replace `Badge` default styling with outlined / text-only variants.

## Open questions

- **Display font.** Geist Sans (current) is fine; should we add a display
  serif (Instrument Serif? Fraunces?) for hero titles? Owner's call.
- **Light or dark by default?** Lean toward `prefers-color-scheme`, fall
  back to light. OK?
- **Logo / mark.** Wordmark only, or do we want a small icon? (A tiny
  knife-edge svg would be on-brand and is cheap.)
- **Density.** Notion is roomy, Linear is dense. For this dataset (dozens
  not thousands), lean Notion-roomy.
- **Should we re-template `shadcn init` with a different preset (Vega /
  Mira / Sera)?** They ship with curated palettes — might save work vs.
  hand-picking. Worth one experiment.

## Phasing

1. **Palette + dark mode**: pick a palette (one light, one dark), wire the
   toggle, swap shadcn tokens. No layout changes yet. ~one sitting.
2. **Header + dashboard**: reskin per above. Drop the stat cards.
3. **Lists** (`/knives`, `/owners`): flat-row treatment, hover, sort dropdown.
4. **Detail pages**: property block primitive, timeline for sessions,
   bleed images.
5. **Polish**: focus rings, transitions, empty states, tabular numbers
   audit.

## Out of scope (separate todos)

- Inline editing in the UI — still blocked by ADR-0006 (API-only writes).
  This redesign is purely cosmetic / IA.
- Image lightbox / gallery viewer — nice-to-have, not part of "reskin".
- Mobile layout — make sure nothing breaks, but don't custom-design for it
  in this pass.
