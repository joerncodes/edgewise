---
filetype: adr
id: "0004"
title: Storage abstraction as the only seam
status: accepted
date: 2026-06-09
---

# Context

Today we want markdown. Later we might want SQLite, Postgres, or a remote
sync target. The rest of the app should not need to change when that
happens.

# Decision

A `Storage` interface in `src/lib/storage/types.ts` defines every read and
write the app performs. `getStorage()` in `src/lib/storage/index.ts` is the
only place that knows which implementation is in use. Today that's
`MarkdownStorage`. Tomorrow it can be anything implementing the interface.

Route handlers depend on `Storage`, never on a concrete class.

# Consequences

- Adding a new backend means: implement the interface, switch `getStorage()`,
  done.
- The interface stays small on purpose. New methods need a real reason.
- No DI framework — the factory is one function. Keep it that way.

# Alternatives considered

- **Direct file access from route handlers.** Cheaper now, painful later.
- **Repository-per-entity with separate exports.** More boilerplate, same
  benefit.
