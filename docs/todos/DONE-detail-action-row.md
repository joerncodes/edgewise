---
filetype: todo
status: done
---

# Give the detail page action row structure

The action row on `/knives/[id]` (`~:318`) is a flat wall of five
near-identical `variant="outline" size="xs"` buttons — Backlog,
On loan, Chat, Edit, Delete (delete is destructive, the rest are
visually equal). Problems:

- **No grouping.** Stateful toggles (backlog, on-loan) sit next to
  one-shot actions (edit, delete) and a tool (chat) with nothing
  separating their kinds.
- **No primary.** Everything reads as equally important, so nothing
  guides the eye to the common action.
- **The most common action is missing here.** "Add session" lives far
  down the page in the sessions section (`~:579`); on a knife-tracking
  app, logging a new sharpening is the thing you do most.

## What we want

- Visually separate the kinds:
  - **Toggles** (backlog, on loan) — these reflect state; consider a
    toggle/segmented treatment or at least a grouped cluster distinct
    from the actions.
  - **Primary action** — hoist "Add session" up into the header as the
    one emphasized button (`variant="default"`), since it's the most
    frequent task.
  - **Secondary/destructive** (chat, edit, delete) — keep quiet;
    delete stays clearly destructive and slightly set apart.
- Don't let the toggle still scroll the user down to the sessions
  section to add — the header button should open the same `SessionForm`
  flow that's already wired in `DetailBody`.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — the button cluster in `header`
  (`~:318`), and the existing `onAddSession` / `addingSession` state
  already threaded into `DetailBody` (`~:412`). The header button can
  drive the same state; the form already lives in the sessions
  section.
- **`src/components/ui/toggle-group.tsx`** — available if a segmented
  treatment fits the toggles.

## Related

- [[DONE-detail-layout-hierarchy]] — the action row's placement is part of
  the top-of-page identity block.
