# Deployment

The app is designed to run in a single container on your homelab Portainer.

## Image

Multi-stage build, Next.js `output: "standalone"`, runs as a non-root user.

Published to GitHub Container Registry on every push to `main` and on
version tags by `.github/workflows/docker.yml`:

- `ghcr.io/joerncodes/edgewise:latest` — head of `main`
- `ghcr.io/joerncodes/edgewise:v0.1.0` — a release tag (also `:0.1`)
- `ghcr.io/joerncodes/edgewise:sha-<short>` — a specific commit

The GHCR package starts out **private**. After the first successful run of
the workflow, go to <https://github.com/joerncodes/edgewise/pkgs/container/edgewise>
→ Package settings → "Change visibility" → Public, so Portainer can pull
without registry credentials.

Build locally as a fallback:

```bash
docker build -t edgewise:local .
```

## Running

The container needs three secrets:

| env             | what                                              |
|-----------------|---------------------------------------------------|
| `APP_PASSWORD`  | The password the UI login form checks against.    |
| `API_TOKEN`     | Bearer token for the API (Claude, scripts, curl). |
| `AUTH_SECRET`   | Auth.js JWT signing secret. `openssl rand -base64 32`. |

And one volume:

| path     | what                                              |
|----------|---------------------------------------------------|
| `/data`  | Markdown files. Bind-mount somewhere safe.        |

Quick run:

```bash
docker run -d --name edgewise \
  -p 3000:3000 \
  -e APP_PASSWORD=$(openssl rand -hex 16) \
  -e API_TOKEN=$(openssl rand -hex 24) \
  -e AUTH_SECRET=$(openssl rand -base64 32) \
  -v /srv/edgewise/data:/data \
  edgewise:local
```

## Portainer stack

Deploy as a stack — either of:

1. **From Git repository**: point Portainer at
   `https://github.com/joerncodes/edgewise`, compose path `docker-compose.yml`,
   reference `refs/heads/main`. Portainer pulls the image referenced in the
   compose; no checkout is required at deploy time.
2. **Web editor / upload**: paste `docker-compose.yml` from the repo.

Set these in the stack's environment block (Portainer "Environment
variables" section):

```
APP_PASSWORD=…
API_TOKEN=…
AUTH_SECRET=…
NEXTAUTH_URL=https://edgewise.your.domain
EDGEWISE_PORT=3000
EDGEWISE_DATA=/srv/edgewise/data
EDGEWISE_IMAGE=ghcr.io/joerncodes/edgewise:latest   # or pin :v0.1.0
```

Notes:
- `NEXTAUTH_URL` should be the public URL when behind a reverse proxy. The
  app sets `AUTH_TRUST_HOST=true` so it accepts the proxied host header.
- `/data` is declared as a `VOLUME` so Docker won't lose it on container
  recreation, but you should bind-mount it to a host path for backups.

## Reverse proxy

Behind Traefik/Caddy/nginx, terminate TLS there and forward `X-Forwarded-*`.
The app does not handle TLS itself. There is no `/healthz` endpoint — use
`GET /api/owners` with the token as a health probe if you need one.

## Backups

Back up the `/data` host directory. The files are plain markdown; `tar`,
`restic`, `borg`, or a daily `cp` to another disk all work.

## Logs

`docker logs edgewise`. Errors from API handlers go through `console.error`
in `src/lib/http.ts` (`serverError`). No structured logging yet.
