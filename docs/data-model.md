# Data model

Storage shape: one markdown file per entity, with YAML frontmatter for
structured fields and the body for free-form notes.

```
$DATA_DIR/
  knives/
    <slug>.md
  owners/
    <slug>.md
  images/
    <knife-id>/
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
| `type`         | string    | no       | chef, paring, santoku, pocket…     |
| `notes`        | string    | no       | the markdown body                  |
| `sessions`     | Session[] | no       | per-sharpening events, oldest→new  |
| `createdAt`    | ISO       | yes      |                                    |
| `updatedAt`    | ISO       | yes      |                                    |

### Session

| field    | type   | required | notes                              |
|----------|--------|----------|------------------------------------|
| `date`   | string | yes      | `YYYY-MM-DD`                       |
| `angle`  | number | yes      | degrees per side, 1–45             |
| `notes`  | string | no       | what was done that day             |

### Image

A knife can carry 0..n images. The frontmatter holds the metadata; bytes
live under `$DATA_DIR/images/<knife-id>/<filename>` and are served via
`GET /api/knives/<id>/images/<filename>`.

| field      | type   | required | notes                                  |
|------------|--------|----------|----------------------------------------|
| `filename` | string | yes      | sanitized name on disk, includes ext   |
| `caption`  | string | no       | optional                               |
| `addedAt`  | ISO    | yes      | server-set on upload                   |

Order in the array matters: the first entry is the "cover".

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

## Referential integrity

- Creating a knife requires the `ownerId` to exist; the API rejects otherwise.
- Deleting an owner that still has knives returns `409`. Reassign or delete the
  knives first.

## Editing by hand

The markdown files are the source of truth. You can edit them on disk with any
editor; the next request will pick them up. Keep `id` matching the filename
and keep `updatedAt` ISO-shaped if you want sorting to stay sane.
