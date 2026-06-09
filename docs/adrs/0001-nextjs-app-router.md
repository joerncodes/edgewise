---
filetype: adr
id: "0001"
title: Use Next.js with the App Router
status: accepted
date: 2026-06-09
---

# Context

We need a small web app that runs as a single container in Portainer on a
homelab. The owner wants TypeScript and React.

# Decision

Use Next.js 16 with the App Router and Turbopack. One framework gives us
SSR, route handlers, file-based routing, and a built-in production server.
`output: "standalone"` produces a self-contained server bundle ideal for
Docker.

# Consequences

- Server and client live in one repo; no separate API service to wire up.
- Locked into the App Router's conventions (route handlers, server/client
  component split, `params` as Promise in Next 16).
- We carry Next.js's footprint even though the app is small. Acceptable.

# Alternatives considered

- **Vite + Express.** Two processes, more wiring, no upside here.
- **Remix.** Comparable; Next.js wins on familiarity and Vercel docs depth.
