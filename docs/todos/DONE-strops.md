---
filetype: todo
status: done
---

# Strops as a recordable step — and rename `Stone` → `Abrasive`

Stones can already carry `type: "strop"` — [[stones]] called that out
explicitly — but a leather strop with green compound is not really a
stone. The grit number on a strop is the *compound's* (chromium oxide
~0.5 µm ≈ 60000 grit), not the substrate's, and the substrate
(leather, balsa, denim, kangaroo, horse butt, MDF) is a meaningful
thing on its own. Right now there's nowhere good to put any of that.

This is the gap: a stropping step at the end of a session is a real
thing the hobbyist does and wants to log, and shoving it into the
existing `Stone` shape loses information.

**Collective name: "abrasive".** Stones and strops live in the same
mental bucket — "thing you push the edge across to refine it" — and
the corpus benefits from one consistent word. Rename the entity from
`Stone` to `Abrasive` as part of this work; a strop becomes an
abrasive with `type: "strop"`, a waterstone is an abrasive with
`type: "waterstone"`, and the category page (`/abrasives`) covers
both. Doing this *before* the strops feature lands avoids shipping a
"stones" entity that contains non-stones.

## Plan in one screen

Two coupled changes, both required:

1. **Rename `Stone` → `Abrasive`** across schema, storage, API,
   pages, and the data dir.
2. **Add strop-specific fields** to the renamed entity so a strop
   record is honest about what it is.

### Schema (`src/lib/storage/types.ts`)

- `StoneSchema` → `AbrasiveSchema`; `Stone` type → `Abrasive`;
  `StoneInputSchema` → `AbrasiveInputSchema`.
- Add two optional fields:
  ```ts
  compound: z.string().optional().default(""),   // e.g. "chromium oxide 0.5 µm"
  substrate: z.string().optional().default(""),  // e.g. "kangaroo leather"
  ```
- `SharpeningSession.stones` → `SharpeningSession.abrasives`. Array
  order still preserved, still the coarse → fine progression.
- Existing records without `compound` / `substrate` stay valid (Zod
  defaults them to `""`). Old `stones:` fields on sessions still in
  the wild get migrated by the data-dir rename (see below).

### Storage (`src/lib/storage/markdown.ts`, `index.ts`)

- `Storage.listStones/getStone/saveStone/deleteStone` →
  `listAbrasives/getAbrasive/saveAbrasive/deleteAbrasive`. Same for
  `saveStoneImage/readStoneImage/deleteStoneImage` →
  `saveAbrasiveImage/…`.
- On-disk: `$DATA_DIR/stones/` → `$DATA_DIR/abrasives/`,
  `$DATA_DIR/stone-images/` → `$DATA_DIR/abrasive-images/`. Square
  400×400 thumb stays.
- Migration is **local-only**. Workflow:
  1. `rsync` the prod data dir down onto the dev machine.
  2. Run a one-off script here that does
     ```sh
     mv data/stones data/abrasives
     mv data/stone-images data/abrasive-images
     ```
     and rewrites each session frontmatter's `stones:` → `abrasives:`
     key.
  3. `rsync` the rewritten data dir back up to prod, then redeploy.

  The script never runs *on* prod — no in-container migration step,
  no extra container entrypoint. Commit the script so the rewrite is
  reproducible if we have to re-pull a backup.

### API

- `/api/stones` → `/api/abrasives` (list, create).
- `/api/stones/[id]` → `/api/abrasives/[id]` (get, patch, delete).
- `/api/stones/[id]/images` and
  `/api/stones/[id]/images/[filename]` → `…/abrasives/…`.
- `POST /api/knives/[id]/sessions` continues to validate the array
  against the abrasive table; rejects unknown IDs with `400`. Key
  in the request body is now `abrasives` not `stones`.
- `DELETE /api/abrasives/[id]` returns `409` when any session still
  references it.

### Pages

- `/stones` → `/abrasives` (list, sorted by sessions-used).
- `/stones/[id]` → `/abrasives/[id]` (detail with hero, gallery,
  session timeline).
- Library menu entry "Stones" → "Abrasives". Lucide icon
  `Layers` is still fine.
- Knife detail session-row chip: same UI, label now reads "abrasive
  progression" in the icon tooltip rather than "stones used".

### Strop-specific rendering (the new bit)

- `/abrasives` list row: when `type === "strop"`, show the compound
  under the name (`chromium oxide 0.5 µm`) instead of (or alongside)
  the grit number.
- `/abrasives/[id]` detail: add `PropertyRow`s for `Compound` and
  `Substrate` when present.
- Session progression chips: for a strop, label the chip with the
  compound shorthand (e.g. `CrOx`) or just `STROP` rather than the
  grit number. The chip still sits in array order — strops naturally
  fall at the end since they're the finest step.

### Filtering / facets / stats

- No facet change. Abrasives aren't faceted today.
- `/stats` "sessions per stone" → "sessions per abrasive". Strops
  show up there for free.
- `/api/facets` unchanged — knife attributes only.

## Open questions

- **Grit on a strop.** Required or optional? Lean **required** —
  even bare leather has an effective grit (~8000–10000). Forcing a
  number keeps the progression sortable.
- **Naming the chip label.** `STROP` vs the compound shorthand
  (`CrOx`, `Diamond 1µm`) vs the grit number. Lean **compound
  shorthand when present, else `STROP`** — gives the most signal in
  the smallest space.
- **Multiple compounds on one strop.** Some hobbyists load one
  strop with two compounds on different sides. Defer — represent as
  two `Abrasive` records (one per loaded side) with the substrate
  naming the side: `Kangaroo strop — green side`, `… — bare side`.
- **`Compound` as its own entity.** Tempting (`CrOx`, `diamond
  paste`, `aluminium oxide` are a small fixed set). Don't. Same
  speculative scope-creep [[stones]] warned about — free-form
  string is fine; promote later if a query needs it.
- **Backwards-compat with the `stones:` session key.** The
  migration script rewrites the on-disk files. The Zod schema
  doesn't accept the old key — clean break. Alternative is dual-
  reading both keys for one release; reject — the migration script
  is small and we control all the data.

## Notes for whoever picks this up

- ADR-0004 (storage seam) and ADR-0006 (API-only CRUD) still apply.
  No new ADR required — the rename + extension is mechanical, not
  architectural.
- The rename touches *a lot* of identifiers. Sketch:
  - `src/lib/storage/types.ts` — schema rename + new fields
  - `src/lib/storage/markdown.ts` — directory + methods rename
  - `src/lib/storage/index.ts` — re-exports
  - `src/lib/stones.ts` → `src/lib/abrasives.ts` (the usage tally
    helpers)
  - `src/app/api/stones/**` → `src/app/api/abrasives/**`
  - `src/app/api/knives/[id]/sessions/route.ts` — body key
    `stones` → `abrasives`, lookup `getStone` → `getAbrasive`
  - `src/app/stones/**` → `src/app/abrasives/**`
  - `src/components/library-menu.tsx` — label + href
  - `src/app/knives/[id]/page.tsx` — `s.stones` → `s.abrasives`
    on the session timeline
  - `src/lib/api-client.ts` — every `listStones`/`getStone`/etc.
    + `stoneImageUrl`/`deleteStoneImage`
  - `src/lib/api-docs.ts` — endpoints, schema names, prose
  - `docs/data-model.md` — Stone section becomes Abrasive
- Migration script lives at `scripts/migrate-stones-to-abrasives.mjs`
  (or `.ts`). Idempotent: if `data/abrasives/` already exists, no-op.
  Designed to run on the **local** dev machine against a copy of the
  prod data — never inside the prod container.
- Cutover order (prod data lives on the snickerdoodle homelab; we
  edit it from this machine):
  1. `rsync` prod's `/data` (the bind-mounted dir) down to `./data`
     on the dev machine. Stop writes to prod for the window — pause
     the container if necessary.
  2. Run the migration script locally:
     `pnpm exec tsx scripts/migrate-stones-to-abrasives.ts`.
  3. Smoke-test against the dev server pointed at the rewritten
     `./data` — list abrasives, fetch a detail page.
  4. `rsync` `./data` back up to prod.
  5. Deploy the new image (with route + schema rename) and start
     the container.
  6. Hit `/api/abrasives` on prod to confirm the rewrite stuck.
  Total prod downtime: the rsync window + image pull. No DB.
- The existing prod corpus already has three abrasives-to-be (the
  two DMTs and the Shapton Glass 1000) and the Missarka. The
  migration must preserve them — verify with `curl
  /api/abrasives | jq '.abrasives | length'` after.
- The dev corpus also has the Opinel session that references the
  Shapton Glass via `stones: [shapton-glass-1000-1000]`. The
  migration rewrites that to `abrasives: [shapton-glass-1000-1000]`.
- Related: [[stones]] (the entity this renames and extends),
  [[stats]] (will pick up strop sessions for free under the new
  name).
