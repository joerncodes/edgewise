---
filetype: todo
status: open
---

# Verify / fix the scan modal on mobile

The "Scan from photo" dialog (`src/components/knife-scan-dialog.tsx`)
shipped with mobile-layout CSS that was reasoned about but **never
screenshot-verified** — a Playwright run to eyeball it got cut off, so
this is unconfirmed.

## What was changed (commit `18a1690`)

- `max-w-[calc(100%-2rem)] sm:max-w-lg` — restore the 1rem side gutter on
  phones that a bare `max-w-lg` was clobbering from the base
  `DialogContent`.
- `max-h-[85dvh]` — account for mobile browser chrome.
- Auto-scroll the streamed-progress area so reasoning stays in view on
  short screens.

## What to check on a real phone

- The dialog has a side gutter and doesn't run edge-to-edge.
- With the soft keyboard open (focusing the URL / instructions field),
  the **Scan** button in the footer is still reachable — the body
  scrolls, but confirm the footer isn't pushed off-screen. If it is,
  consider moving the action into the scrollable body or shrinking
  `max-h` further on mobile.
- The close (✕) button doesn't overlap the title/description on the
  narrowest widths.
- During a scan, the auto-scroll follows the streamed reasoning without
  jank.

## Where to look

- `src/components/knife-scan-dialog.tsx` — the dialog.
- `src/components/ui/dialog.tsx` — base `DialogContent`
  (`max-w-[calc(100%-2rem)] sm:max-w-sm`, the pattern this mirrors).
- `src/components/knife-chat.tsx` — sibling streaming dialog; same
  `vh`-based sizing, so any fix here probably applies there too.

## Related

- [[DONE-vision-scan-knife]] — the scan feature this dialog belongs to.
