---
filetype: adr
id: "0002"
title: Use shadcn/ui for components
status: accepted
date: 2026-06-09
---

# Context

We need a small set of polished React components (button, input, table,
dialog, toaster) without dragging in a large opinionated design system.

# Decision

Use **shadcn/ui** on the Radix base. Components are copied into
`src/components/ui/` so we own the code and can edit it freely.

# Consequences

- No runtime dependency on a UI library; components live in the repo.
- We pull in Radix primitives and Tailwind, both already wanted.
- Updates are explicit (`pnpm dlx shadcn@latest add <name>` or `--overwrite`).
  There is no automatic upgrade path — that's a feature, not a bug, for an
  app this size.

# Alternatives considered

- **MUI / Mantine.** Heavier, less control over the markup.
- **Hand-rolled Tailwind components.** More work, easy to half-finish.
