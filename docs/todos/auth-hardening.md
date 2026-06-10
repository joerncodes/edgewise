---
filetype: todo
status: open
---

# Sharpen login auth security

Two related issues observed on prod:

1. **Nav links bypass the login gate.** From the login page, clicking
   a nav link (Backlog, Stats, Diary, the Library menu) in the top
   bar appears to navigate to that page rather than re-routing to
   `/login?callbackUrl=…`. The expected behaviour is that no
   protected page renders until the JWT cookie is present — the
   middleware (`src/proxy.ts`) is supposed to redirect every non-
   `/login` URL to `/login` when `req.auth` is absent.
2. **Password sometimes fails.** The exact `APP_PASSWORD` value
   gets rejected intermittently on prod. Reproduction is not yet
   reliable — happens often enough to be reported, not often enough
   to nail a steady repro.

Both feel like auth-layer bugs, not unrelated. Worth investigating
together.

## Where to look

- **`src/proxy.ts`** — only the login page, `/api/auth`, and
  `llms.txt` are allowed through unauthenticated. Everything else
  *should* redirect. Check whether the matcher in `config.matcher`
  is actually catching the nav routes on prod. The current matcher
  excludes `_next/static`, `_next/image`, `favicon.ico` — fine —
  but if Next.js prefetches the protected pages from the login
  page, the prefetch may surface the page HTML through the client
  router cache without the middleware actually running. The
  `<Link>` tags in `src/app/layout.tsx` are rendered on `/login`
  too — they prefetch on hover and on mount.
- **`src/lib/auth.ts`** — `timingSafeEqual` short-circuits on
  length mismatch, which is fine. `APP_PASSWORD` is read from
  `process.env` per request. If the env var contains a trailing
  newline (or whitespace) on prod that doesn't exist in dev, the
  password comparison would silently fail. Check Portainer
  stack env handling — the YAML quoting can introduce a
  `\n` or strip a leading space depending on how it's written.
- **Auth.js `trustHost: true`** — fine for our setup, but the
  cookie domain / `AUTH_URL` mismatch would prevent the session
  cookie from being set. If `AUTH_URL` points at a different
  origin than the user is hitting (reverse proxy mismatch), the
  cookie won't round-trip. Then `req.auth` is always null, login
  appears to succeed once, and the redirect lands back at
  `/login`.
- **`src/app/login/page.tsx`** — on success it calls
  `router.push(callbackUrl)` then `router.refresh()`. If the
  cookie hasn't propagated by the time `router.push` runs, the
  middleware bounces back to `/login`. From the user's
  perspective that reads as "the password didn't work" even
  though it did.

## What to investigate (suggested order)

1. **Reproduce nav-bypass locally.** Sign out, hit `/login`,
   try the top nav links. If those load without redirect, the
   bug is in the matcher / the link behaviour, not prod-only.
2. **Inspect `APP_PASSWORD` on prod.** Decode the running
   container env (`docker exec` → `printenv APP_PASSWORD | xxd`)
   and compare bytes to the intended value. Trailing newlines
   or quoting artefacts are the most likely culprit for the
   intermittent failure.
3. **Confirm `AUTH_URL`.** It must match the public origin
   exactly — same scheme, no trailing slash. Mismatch causes
   silent cookie drops.
4. **Trace one prod login attempt** with the browser devtools
   open. Look for: the POST to `/api/auth/callback/credentials`,
   the `Set-Cookie` in the response, the next request carrying
   the cookie, and whether the middleware-redirected response
   on the *next* page load reads `req.auth`.

## Possible fixes

- **Hide / disable the nav on the login page.** Simplest belt-
  and-braces: don't render `LibraryMenu` / `NavLink` at all
  when there's no session. The middleware should be the
  authoritative gate, but a UI that doesn't *offer* links the
  user can't follow is friendlier and removes the surface area.
- **Switch from `process.env.APP_PASSWORD` reads at call time
  to a normalised module-level constant** that trims surrounding
  whitespace and rejects empty values at startup. Logs a loud
  error during boot rather than failing silently per request.
- **Add `await` around `router.refresh()` after `router.push`**
  in the login form, or use `window.location.assign(callbackUrl)`
  to guarantee a full page load that picks up the cookie. The
  current `push` + `refresh` sequence is racy.

## Out of scope

- Rate limiting / brute-force protection (single-user app on a
  homelab — separate concern, see [[later]]).
- Switching to passkeys / OAuth — see ADR-0005, single env-var
  password is the chosen model and stays for now.

## Related

- ADR-0005 — single env-var password auth model.
- `src/proxy.ts`, `src/lib/auth.ts`, `src/app/login/page.tsx`,
  `src/app/layout.tsx` (nav rendering).
- `docs/deployment.md` for the Portainer / reverse-proxy notes
  on `AUTH_URL`.
