---
filetype: adr
id: "0007"
title: Sharpening sessions carry their own angle
status: accepted
date: 2026-06-09
---

# Context

A knife can be re-profiled later at a different angle than originally
sharpened. We need that history, not just the most recent angle.

# Decision

Each `Session` has `{ date, angle, notes }`. A knife has many sessions.
`angle` does **not** live on the knife itself.

# Consequences

- The full sharpening history is preserved. We can see when a knife was
  re-profiled and at what angle.
- "Current angle" is derived: it's the angle of the latest session.
- Slightly more typing per session entry; acceptable.

# Alternatives considered

- **Knife.angle + Knife.sharpenedAt[].** Loses history; if the angle
  changed at session 3 we'd have no record of the earlier angle.
