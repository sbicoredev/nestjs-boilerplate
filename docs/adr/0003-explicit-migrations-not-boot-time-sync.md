# ADR 0003: Explicit migrations, never `synchronize` or auto-run at boot

- **Status**: Accepted
- **Date**: 2026-01-01 (retroactively documented from existing code)

## Context

TypeORM offers `synchronize: true` (auto-generate and apply schema changes
from entities at connection time) and `migrationsRun: true` (apply
pending migrations automatically at boot). Both are convenient for
solo/local development but dangerous once more than one instance of the
app can start concurrently, or once schema changes need review.

## Decision

- `synchronize` is force-disabled outside `development`
  (`environment !== "production" && dbCfg.sync` — note this only enables
  it in `development`, and even there only when `DB_SYNC=true`), and the
  standalone migration `DataSource` used by the CLI never enables it at
  all (`synchronize: false`, hardcoded).
- `migrationsRun: false` in `DatabaseModule` — the running app never
  applies migrations itself. They're run explicitly via
  `pnpm run migration:run`, as a distinct deploy step.

## Alternatives considered

- **`migrationsRun: true`** — one less deploy step. Rejected: with N
  replicas starting concurrently during a rolling deploy, N copies of the
  migration runner would race against the same database, with no
  coordination between them.
- **`synchronize: true` in production** — no migration files to write at
  all. Rejected: no review step before a schema change goes live, no
  reliable rollback, and can silently produce destructive changes
  (dropped columns) that a hand-reviewed migration would have caught.

## Consequences

- **Easier**: schema changes are reviewable (a migration file is a diff
  someone can look at before it runs), rollback-able
  (`pnpm run migration:revert`), and safe under concurrent replica
  startup.
- **Harder**: one more explicit step in the deploy pipeline — migrations
  must run (and succeed) before the new app version starts serving
  traffic, which needs to be encoded in deploy tooling rather than being
  automatic.

## Revisit when

If deploy tooling adds a reliable "run this exactly once, before any
replica starts" primitive (e.g. a dedicated migration Job/init step in
your orchestrator) — at that point, `migrationsRun: true` becomes safe to
reconsider, but the explicit-step approach should remain the default
until that primitive is actually in place, not assumed.
