# Initial follow-ups

Things worth doing once the bare-bones app is in your hands.

- [ ] Per-session photos. Drop a photo into a session — store under
      `$DATA_DIR/knives/<id>/sessions/<date>/`, reference from frontmatter.
- [ ] Edit/delete an individual session (currently you can only add; to fix
      a typo you'd edit the markdown by hand).
- [ ] Sort/filter on `/knives` (by owner, type, last sharpened).
- [ ] Mark "needs sharpening" — schedule next visit based on interval.
- [ ] `/healthz` route so the reverse proxy can probe cleanly.
- [ ] Export everything as a single JSON dump (`GET /api/export`).
