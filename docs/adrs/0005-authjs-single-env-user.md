---
filetype: adr
id: "0005"
title: Auth.js Credentials with a single env-var user
status: accepted
date: 2026-06-09
---

# Context

This is a single-user homelab app. We need a login wall but not a user
database. We also need scripted access from outside (curl, Claude) without
juggling cookies.

# Decision

- Use **Auth.js v5** with the **Credentials provider** for the web UI.
- The only "user" is configured via `APP_PASSWORD`. The `authorize` callback
  compares the submitted password against the env var using a
  constant-time comparison.
- Session strategy: **JWT** (no DB).
- A second auth path lives in `src/proxy.ts`: requests carrying
  `Authorization: Bearer $API_TOKEN` are let through regardless of session.

# Consequences

- One human secret (`APP_PASSWORD`) and one machine secret (`API_TOKEN`)
  to rotate. Plus `AUTH_SECRET` for JWT signing.
- No registration, no password reset — by design. Change the env var, redeploy.
- Both paths must stay in sync; the proxy file is the only place to change
  routing rules.

# Alternatives considered

- **OAuth provider (GitHub).** Adds external dependency and OAuth app
  setup for a personal tool.
- **Basic Auth at the reverse proxy.** Works for the human path but doesn't
  give us a clean Bearer-token API path.
- **Single shared token, no Auth.js.** Cheaper now but loses CSRF protection
  and signed cookies for the browser.
