---
filetype: todo
status: open
---

# Mobile capture flow for adding a session at the bench

Adding a session today means picking up a laptop, navigating to the
knife, scrolling to the session list, filling a form designed for a
desktop. That friction kills the diary — sessions are most likely
to be recorded right after sharpening, but right after sharpening
your hands are wet and your laptop isn't open.

A dedicated, big-tap-target, mobile-first capture flow would mean
the session log actually reflects what happened.

## What we want

- A `/capture` route (or `/sessions/new`) optimized for a phone.
  One thing on the screen at a time: pick knife → pick angle →
  pick abrasives → notes → save.
- **Prefill aggressively** from the knife's last session:
  - `angle` defaults to the last one used on this knife
  - `abrasives` defaults to the last progression
  - Today's date is the default for `date`
- **Photo capture** in the same flow — wire the multipart image
  upload into the last step. `<input type="file" accept="image/*" capture="environment">`
  goes straight to the camera on iOS/Android.
- After save: confirmation toast + a "log another" button (probably
  for the same knife) and a link to the knife detail page.

## Where to look

- **`src/app/knives/[id]/page.tsx`** — wherever the existing
  "add session" form lives. Reuse the API client calls
  (`api.addSession`, `api.uploadImage`) but rewrite the UI.
- **`src/lib/api-client.ts`** — already has everything needed.
- **`src/components/knife-filters.tsx`** — its mobile sheet pattern
  is the closest precedent for a phone-shaped UI in this app.
- **`src/app/layout.tsx`** — add a top-bar entry (`Plus` icon)
  that's only visible on mobile widths (`md:hidden`). On desktop
  the existing per-knife add-session form stays the primary path.

## Open questions

- **Knife picker.** With 30–40 knives this is a long select. A
  text-filter combobox is the right pattern, but base-ui doesn't
  ship one — would need either a hand-rolled component or a
  dependency. Start with a plain searchable list (input + filtered
  `<ul>`), iterate if it's annoying.
- **Offline.** Sharpening happens in places without wifi. PWA /
  service-worker / IndexedDB queue is a big project; defer until
  someone actually loses a session to bad signal. The simpler
  half-step: keep the form state in `localStorage` so a refresh
  doesn't drop it.
- **Default to last knife.** If you just sharpened knife A and
  saved it, the next session is more likely to be knife A again
  (touch-up after testing) than a random other knife. Keep the
  picker preselected to the last-saved-knife for some short
  window (e.g. 1 hour).

## Out of scope

- Native app. PWA at most; no React Native, no app store.
- Voice notes / speech-to-text in `notes`. Cute, not required.
- Bench timer (sharpening duration tracking). Separate todo if
  ever wanted.

## Related

- `src/app/knives/[id]/page.tsx` — the desktop add-session form.
- [[DONE-session-rating]] — the rating field is part of the flow.
- [[DONE-stones]] / [[DONE-strops]] — abrasive picker source.
