# Data model

Storage shape: one markdown file per entity, with YAML frontmatter for
structured fields and the body for free-form notes.

```
$DATA_DIR/
  knives/
    <slug>.md
  owners/
    <slug>.md
  steels/
    <slug>.md
  abrasives/
    <slug>.md
  images/
    <knife-id>/
      <filename>
  abrasive-images/
    <abrasive-id>/
      <filename>
```

`<slug>` is `slugify(name)` unless an explicit `id` is provided on create.

## Owner

`owners/<id>.md`:

```yaml
---
id: jane-doe
name: Jane Doe
contact: jane@example.com
createdAt: 2026-06-09T12:00:00.000Z
updatedAt: 2026-06-09T12:00:00.000Z
---

Brings her Wüsthof set twice a year. Prefers a 17° edge on the petty.
```

Fields:

| field       | type   | required | notes                                |
|-------------|--------|----------|--------------------------------------|
| `id`        | string | yes      | slug, file name without `.md`        |
| `name`      | string | yes      |                                      |
| `contact`   | string | no       | free-form (email, phone, Slack…)     |
| `notes`     | string | no       | the markdown body                    |
| `createdAt` | ISO    | yes      | set by server on create              |
| `updatedAt` | ISO    | yes      | bumped on every save                 |

## Knife

`knives/<id>.md`:

```yaml
---
id: wusthof-classic-8
name: Wüsthof Classic 8" Chef
ownerId: jane-doe
manufacturer: Wüsthof
steel: X50CrMoV15
handle: black POM
type: chef
sessions:
  - date: 2026-01-15
    angle: 20
    notes: Light touch-up, 1000/6000
  - date: 2026-05-02
    angle: 18
    notes: Reprofiled
createdAt: 2026-06-09T12:00:00.000Z
updatedAt: 2026-06-09T12:00:00.000Z
---

Small chip near the heel. Customer aware.
```

Fields:

| field          | type      | required | notes                              |
|----------------|-----------|----------|------------------------------------|
| `id`           | string    | yes      |                                    |
| `name`         | string    | yes      |                                    |
| `ownerId`      | string    | yes      | must match an existing owner       |
| `manufacturer` | string    | no       |                                    |
| `steel`        | string    | no       |                                    |
| `handle`       | string    | no       | handle material — G10, micarta, wood, stag, horn… |
| `type`         | string    | no       | chef, paring, santoku, pocket…     |
| `notes`        | string    | no       | the markdown body                  |
| `backlog`      | boolean   | no       | true while waiting to be sharpened |
| `backlogPosition` | number | no       | manual queue position (1, 2, 3, …) |
| `onLoan`       | boolean   | no       | true when physically here but not mine |
| `sessions`     | Session[] | no       | per-sharpening events, oldest→new  |
| `createdAt`    | ISO       | yes      |                                    |
| `updatedAt`    | ISO       | yes      |                                    |

`backlog` is a manual flag: set it to `true` via `PATCH /api/knives/{id}`
when the knife is dropped off, and the `/backlog` page will surface it.
Adding a session via `POST /api/knives/{id}/sessions` clears the flag
automatically — sharpening obviously means it's no longer waiting. Absent
or `false` means "not in the backlog".

`onLoan` is orthogonal to `ownerId`: every knife already has an owner,
this flag captures the physical state ("not mine, but in my house right
now"). Absent or `false` means "not on loan". Set/cleared via
`PATCH /api/knives/{id}`. An on-loan knife can also be in the backlog —
the two flags don't interact.

`backlogPosition` is the manual queue order on `/backlog`. Flagging a
knife into the backlog auto-appends it (position = max + 1); the
drag-and-drop UI rewrites positions as `1, 2, 3, …` via
`POST /api/backlog/reorder`. Clearing `backlog` (manually or via the
first session) also clears `backlogPosition`. A knife with
`backlog: true` and no `backlogPosition` renders at the end of the
manual view, sorted by `createdAt` — no special-case migration needed.

### Session

| field    | type     | required | notes                                |
|----------|----------|----------|--------------------------------------|
| `date`   | string   | yes      | `YYYY-MM-DD`                         |
| `angle`  | number   | yes      | degrees per side, 1–45               |
| `notes`  | string   | no       | what was done that day               |
| `rating` | number   | no       | subjective 1–5, free precision       |
| `abrasives` | string[] | no    | `Abrasive.id`s in coarse → fine order |

`rating` is the owner's gut feel for how the session went. Free-precision
float in `[1, 5]` (e.g. `2.6`, `4.8`). The UI rounds to the nearest half
step for display (stars), but the on-disk value stays exact.

`abrasives` is the progression for the session — array order is
meaningful (`["shapton-400", "shapton-1000", "shapton-5000",
"kangaroo-strop"]`) and is never sorted on read or write. Pre-existing
sessions have no `abrasives` field and that stays valid. The array
covers stones, strops, and anything else recorded as an Abrasive (see
the Abrasive section below). `POST /api/knives/{id}/sessions` rejects
sessions referencing an unknown abrasive ID with `400`.

### Image

A knife can carry 0..n images. The frontmatter holds metadata as the
shared `ImageRef` shape; bytes live under
`$DATA_DIR/images/<knife-id>/<filename>` and are served via
`GET /api/knives/<id>/images/<filename>`.

| field      | type   | required | notes                                  |
|------------|--------|----------|----------------------------------------|
| `filename` | string | yes      | sanitized name on disk, includes ext   |
| `caption`  | string | no       | optional                               |
| `addedAt`  | ISO    | yes      | server-set on upload                   |

Order in the array matters: the first entry is the "cover". The same
`ImageRef` shape is reused by Abrasive — see the Abrasive section below.

Supported MIME types: `image/jpeg`, `image/png`, `image/webp`. Max upload
size: 10 MB.

### On-disk layout with images

```
$DATA_DIR/
  knives/
    guido-kleines-santoku.md
  owners/
    guido-goebbels.md
  images/
    guido-kleines-santoku/
      guido-kleines-santoku.png
```

Deleting a knife removes the matching `images/<knife-id>/` directory too.

Prior versions stored image bytes under `$DATA_DIR/knives/<id>/images/`.
Migration is a one-shot `mv data/knives/<id>/images data/images/<id>` per
knife — no frontmatter changes; filenames in the `images:` array still
match the on-disk basenames.

`angle` is per-session: a knife can be re-profiled over time.

## Steel

`steels/<id>.md`:

```yaml
---
id: 80crv2
name: 80CrV2
composition: 0.8% C, 0.5% Cr, 0.15% V
createdAt: 2026-06-09T12:00:00.000Z
updatedAt: 2026-06-09T12:00:00.000Z
---

High-carbon steel. **Wipe dry after every use and oil occasionally**
— it'll rust otherwise. Takes a fine edge on the 4000 grit, holds it
well in a kitchen if you're not chopping bones.
```

Fields:

| field          | type   | required | notes                                    |
|----------------|--------|----------|------------------------------------------|
| `id`           | string | yes      | slug, file name without `.md`            |
| `name`         | string | yes      | canonical display spelling               |
| `composition`  | string | no       | free-form alloy formula                  |
| `notes`        | string | no       | the markdown body — care, behaviour, etc |
| `createdAt`    | ISO    | yes      |                                          |
| `updatedAt`    | ISO    | yes      |                                          |

`Knife.steel` is a **soft** reference: the string should match a
`Steel.id` (i.e. `slugify(Knife.steel) === Steel.id`), but the API
does NOT reject an unknown string when creating or updating a knife.
This lets you record a knife before you've researched its steel; the
steel record can be created later and the existing knives will pick
it up automatically.

Slug canonicalisation: steel names are weird (`80CrV2`, `80Crv2`,
`AUS-8`, `AUS8`). Display uses the spelling from `Knife.steel` or
`Steel.name`; grouping and routing use `slugify()` against the steel
string. Two knives whose `steel` strings slugify to the same value
are considered the same steel.

## Abrasive

`abrasives/<id>.md`:

```yaml
---
id: shapton-pro-1000-1000
name: Shapton Pro 1000
grit: 1000
type: waterstone
createdAt: 2026-06-10T12:00:00.000Z
updatedAt: 2026-06-10T12:00:00.000Z
---

Splash-and-go, no soak. Dishes faster than the 2000 — flatten roughly
every 20 sessions.
```

A strop is the same shape, with `type: "strop"` and the strop-specific
fields populated:

```yaml
---
id: kangaroo-strop-60000
name: Kangaroo strop
grit: 60000
type: strop
compound: chromium oxide 0.5 µm
substrate: kangaroo leather
createdAt: 2026-06-10T12:00:00.000Z
updatedAt: 2026-06-10T12:00:00.000Z
---
```

Abrasive covers stones, strops, and anything else you push an edge
across to refine it. `type` discriminates. See [[strops]] for the
rationale behind one entity rather than parallel `Stone` / `Strop`
tables.

Fields:

| field       | type   | required | notes                                    |
|-------------|--------|----------|------------------------------------------|
| `id`        | string | yes      | slug, file name without `.md`            |
| `name`      | string | yes      | free-form (`Shapton Pro 1000`, `Kangaroo strop`) |
| `grit`      | number | yes      | the defining property; unitless. For a strop, the *effective* grit of the compound. |
| `type`      | string | no       | `waterstone`, `diamond plate`, `ceramic`, `strop` |
| `compound`  | string | no       | strop-specific. `chromium oxide 0.5 µm`, `diamond paste 1 µm`, etc. |
| `substrate` | string | no       | strop-specific. `leather`, `balsa`, `denim`, `MDF`. |
| `notes`     | string | no       | the markdown body — soak time, flattening reminders, dishing observations |
| `images`    | ImageRef[] | no   | metadata for 0..n images; same shape as knives |
| `createdAt` | ISO    | yes      |                                          |
| `updatedAt` | ISO    | yes      |                                          |

`grit` is a bare number — no scale qualifier. JIS is the default; pick
a scale and stick with it across the corpus. For strops the number
represents the *compound's* effective grit (chromium oxide ≈ 60000),
so the array ordering stays consistent end-to-end. Sessions link to
abrasives by `id` (see `session.abrasives` above).

Abrasive image bytes live under
`$DATA_DIR/abrasive-images/<abrasive-id>/<filename>` — a separate
root from knife images so cleanup on abrasive delete can just
`rm -rf` the directory. Same upload pattern as knives
(`POST /api/abrasives/{id}/images` multipart, `GET … ?size=thumb`
for the cache-on-miss thumbnail), but the thumbnail is a 400×400
square cover rather than a 3:1 banner — abrasives are roughly square
objects, so a banner crop loses the part you care about. Deleting
an abrasive removes the matching `abrasive-images/<abrasive-id>/`
directory too.

The `images:` array uses the shared `ImageRef` shape:

| field      | type   | required | notes                                  |
|------------|--------|----------|----------------------------------------|
| `filename` | string | yes      | sanitized name on disk, includes ext   |
| `caption`  | string | no       | optional                               |
| `addedAt`  | ISO    | yes      | server-set on upload                   |

Same shape as the knife `images:` array. Order matters: the first
entry is the "cover" rendered as the row thumbnail on `/abrasives`
and the hero on `/abrasives/<id>`.

## Referential integrity

- Creating a knife requires the `ownerId` to exist; the API rejects otherwise.
- Deleting an owner that still has knives returns `409`. Reassign or delete the
  knives first.
- Deleting a steel that any knife references returns `409`. Change or
  clear the knife's `steel` field first.
- A session's `abrasives[]` are foreign keys: `POST /api/knives/{id}/sessions`
  rejects unknown abrasive IDs with `400`. Deleting an abrasive that any
  session still references returns `409` — remove or rewrite those
  sessions first.

## Editing by hand

The markdown files are the source of truth. You can edit them on disk with any
editor; the next request will pick them up. Keep `id` matching the filename
and keep `updatedAt` ISO-shaped if you want sorting to stay sane.
