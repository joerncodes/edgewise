---
filetype: adr
id: "0003"
title: Markdown files on disk as the storage format
status: accepted
date: 2026-06-09
---

# Context

The dataset is tiny (dozens of knives, dozens of owners), single-user, and
the owner already keeps personal knowledge in markdown. The app needs to be
trivial to back up and to inspect without the UI running.

# Decision

Store each entity in its own `.md` file with YAML frontmatter:

```
$DATA_DIR/
  knives/<id>.md
  owners/<id>.md
```

Frontmatter holds structured fields; the body is free-form notes.
`MarkdownStorage` rewrites the entire file on every save — there is no
partial-update path.

# Consequences

- Backups are `tar`-able. The owner can grep, edit by hand, sync to a
  separate notes vault.
- No schema migrations as long as field changes are additive. Non-additive
  changes need a one-shot script and a note in `docs/data-model.md`.
- Listing is O(files-on-disk) — fine at this scale; would not be fine at
  10k+ files.
- No concurrent-writer safety. We don't have concurrent writers.

# Alternatives considered

- **SQLite.** Smaller in code, harder to inspect/back up, opaque without
  a tool. Worth revisiting if the dataset grows.
- **JSON dump.** Loses the "human-readable, editable" property.
