---
filetype: adr
id: "0008"
title: Deploy as a single container on Portainer with a /data bind mount
status: accepted
date: 2026-06-09
---

# Context

The app lives on a homelab Portainer. Data is markdown files. Backups,
inspection, and the occasional manual edit must be easy.

# Decision

- Multi-stage Dockerfile with Next.js `output: "standalone"`. Runs as a
  non-root user.
- Persistent data lives at `/data` inside the container, declared as a
  `VOLUME`, and is **bind-mounted** to a host path in the compose file.
- `docker-compose.yml` is shaped for a Portainer stack: secrets via
  environment variables, image either built locally or pulled from a
  registry (`EDGEWISE_IMAGE`).
- The container does not terminate TLS or expose `/healthz`. A reverse
  proxy in front handles TLS and (if needed) health probing.

# Consequences

- Backups are a host-level `tar` job. No DB dump step.
- Updating the image requires no migration as long as schema changes stay
  additive.
- Tied to a Linux/Docker host. Acceptable.

# Alternatives considered

- **Named Docker volume.** Cleaner managed lifecycle, but harder to peek
  at the files from the host.
- **Repo-internal `./data`.** Lost on container recreation — wrong by
  default for persistence.
