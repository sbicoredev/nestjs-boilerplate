# Database & Migrations

## Stack

PostgreSQL by default (MySQL/MariaDB also supported via `DB_TYPE`) through
TypeORM, connected via a single `DB_URL` connection string.

There are **two separate TypeORM setups** in this codebase, and it's
important to know which is which:

|                  | `core/database/database.module.ts`              | `core/database/data-source.ts`                                                |
| ---------------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| Used by          | the running app (via `@nestjs/typeorm`)         | the migration CLI only (`pnpm run migration:*`)                               |
| Reads config via | `ConfigService` (validated)                     | raw `process.env` (unvalidated — no DI container available to a plain script) |
| `synchronize`    | env-gated (`development` + `DB_SYNC=true` only) | always `false`                                                                |
| `migrationsRun`  | always `false`                                  | n/a — this _is_ the migration runner                                          |

Both read `DB_URL`, `DB_TYPE`, `DB_ENABLE_SSL`, and
`DB_SSL_REJECT_UNAUTHORIZED` from the same `.env` file, so their behavior
stays in sync even though the plumbing is separate.

## Why migrations aren't run automatically at boot

`migrationsRun: false` in `DatabaseModule` is deliberate: if every replica
ran pending migrations on startup, a rolling deploy with N replicas would
race N copies of the same migration against each other. Migrations are
applied **explicitly**, as a distinct deploy step, before new app code
that depends on the new schema goes live.

## Schema sync vs. migrations

`DB_SYNC=true` lets TypeORM auto-generate the schema from your entities —
convenient for early local prototyping. Two safety nets:

- `DatabaseModule` force-disables `synchronize` outside `development`
  regardless of `DB_SYNC`, so it can never accidentally run in staging/prod.
- Anything beyond early local work should use real migrations instead —
  `DB_SYNC` diverges from what's actually deployed the moment you have more
  than one environment.

## Writing a migration

```bash
# Hand-written, empty migration
make migration-new
# or: pnpm run migration:create database/migrations/<name>

# Auto-generated from entity changes (diffs current DB vs. your entities)
make migration-gen
# or: pnpm run migration:generate database/migrations/<name>
```

Always **read the generated SQL** before committing — auto-generated
migrations can be destructive (e.g. a column rename gets generated as
drop + add, losing data) and need manual correction in those cases.

```bash
pnpm run migration:run       # apply pending migrations
pnpm run migration:revert    # roll back the most recent migration
pnpm run migration:show      # list applied/pending migrations
```

Migration files live in `database/migrations/` at the repo root (not under
`src/`) — this is intentional so the compiled `dist/database/migrations/`
output mirrors it directly without a `src/` segment to strip.

## Adding an entity

1. Define it under your feature module, e.g.
   `src/modules/<feature>/entities/<name>.entity.ts` — see
   `modules/todo/entities/todo.entity.ts` for the pattern.
2. `autoLoadEntities: true` (`DatabaseModule`) means you don't need to
   register it anywhere globally — TypeORM discovers it automatically. You
   still need `TypeOrmModule.forFeature([YourEntity])` in your feature
   module to inject its `Repository`.
3. Generate a migration (`make migration-gen`) rather than relying on sync.

## Connection pooling & timeouts

Configured via `DatabaseConfig` (see [Configuration](./configuration.md)):
`DB_MAX_CONNECTIONS` (pool size, 1–100) and `DB_CONNECT_TIMEOUT` (seconds).
Tune these based on your Postgres provider's own connection limits —
`maxConnections × number of app replicas` needs to stay under whatever
your database allows, with headroom for migrations/admin connections.

## TLS

See [`SECURITY.md`](../SECURITY.md#database-tls-db_enable_ssl-db_ssl_reject_unauthorized).
