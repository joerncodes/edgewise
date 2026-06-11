---
filetype: todo
status: done
---

# Year tabs on top of the diary

`/diary` groups sessions by month with headers like `MAR 2026`,
`FEB 2026`, etc. (see `src/app/diary/page.tsx`). When the list crosses
a year boundary — e.g. `JAN 2026` → `DEC 2025` — there's no visual
break, and to reach an older year you have to scroll past every month
in between.

Add shadcn `Tabs` at the top of the page, one tab per year present in
the diary, defaulting to the most recent year. Selecting a tab filters
the month list to that year only. The month headers stay as-is inside
each tab.

## Notes

- Implementation is purely client-side in `src/app/diary/page.tsx`.
  Derive the year set from `diary.months` by slicing `m.month`
  (`YYYY-MM`) — don't add a year field to the API response.
- Use `@/components/ui/tabs` (shadcn). Add it with
  `pnpm dlx shadcn@latest add tabs` if it's not already installed.
- Default tab = highest year present. If only one year exists, still
  render the tabs (consistent layout) — or skip them; pick whichever
  feels less noisy when you get there.
- Keep the existing month `<h2>` headers and the `Row` component
  untouched.
- Touches [[diary]] (the original diary todo, already done).
