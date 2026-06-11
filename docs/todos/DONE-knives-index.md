---
filetype: todo
status: done
completedOn: 2026-06-09
---

# Front page: controls + card grid

The home page (`/`) becomes the knives view: a row of live controls and a
reflowing card grid that makes the page feel like it's *about sharpening*,
not a CRUD list. The separate `/knives` route is gone — the wordmark in
the masthead links here.

## The controls

A single row under the masthead, all working together — narrowing by search
while filtered to one person, sorted however you like. Changing the search
never resets the owner you've filtered to.

- **Search box.** Filters knives as you type. Matches on owner, knife name,
  type, or steel. No submit button — results narrow live.
- **Owner filter dropdown.** Show just one person's knives. "All owners" is
  the default.
- **Sort dropdown.** Four orders:
  1. Longest since last sharpened *(default — surfaces what's overdue)*
  2. Most recently sharpened
  3. Owner A–Z
  4. Most recently added

## The cards

Below the controls, a grid that reflows to the window — wide on a laptop,
single-column on a phone.

Each card shows, at a glance:

- **Owner** — small, in brass, up top.
- **Name and type** — the knife itself.
- **Steel** — a small chip, *only if recorded*.
- **Angle** — drawn as an actual edge. A small V rendered at the exact
  bevel angle, so a keener 15°-per-side edge visibly looks narrower than a
  chunkier 20°. Beside the drawing, the angle is spelled out in degrees,
  both per-side and inclusive. **This is the thing that makes the card feel
  like it's about sharpening and not just a list entry.**
- **Last sharpened** — date plus a plain "3 weeks ago" / "8 months ago"
  reading next to it. If it's never been sharpened, say so.
- **Notes** — anything you've left about the knife.

Each card has a quiet **History** toggle that expands to show every past
sharpening for that knife — each with its date, any notes, and the angle
that time.

## Empty states

- **No knives yet.** A single calm prompt to add the first one — not a
  blank screen.
- **Search/filter matches nothing.** Say so plainly and tell the user to
  clear the search or filter, rather than looking broken.

## Notes for whoever picks this up

- Sits on top of [[redesign]] — the card grid replaces the flat-row list
  that the redesign todo currently proposes for `/knives`. Now that this
  view lives at `/`, the redesign todo's `/` and `/knives` sections both
  need rereading once this lands.
- ADR-0006 still applies — this is a read-only redesign of `/knives`. No
  inline create/edit; "add the first one" in the empty state can link to a
  curl example or just be aspirational copy until the UI gains writes.
- Relative-time ("3 weeks ago") wants a tiny helper; don't pull in
  date-fns if `Intl.RelativeTimeFormat` suffices.
- The V-shaped edge can be a single inline SVG — no graphics library.
