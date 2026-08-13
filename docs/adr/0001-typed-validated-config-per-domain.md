# ADR 0001: Typed, validated, per-domain configuration classes

- **Status**: Accepted
- **Date**: 2026-01-01 (retroactively documented from existing code)

## Context

Every backend needs to read environment variables. Left unchecked, this
usually means `process.env.SOME_VAR` scattered across the codebase, with
no compile-time or boot-time guarantee it's set, correctly typed, or
within a sane range — problems surface at runtime, often deep in a
request path, far from the actual missing config.

## Decision

Every configuration domain (`app`, `database`, `redis`, `cache`,
`ratelimiter`, `email`) is a `class-validator`-decorated class in
`src/configs/`, registered via `@nestjs/config`'s `registerAs()`, and
validated synchronously at boot (`validatedConfig()` — `plainToInstance` +
`validateSync`, throwing on any failure). `ConfigModule` is configured
with `skipProcessEnv: true`, reading only from a specific `.env` file
(`.env.test.local` under `NODE_ENV=test`, else `.env`) — no ambient shell
env vars leak in.

## Alternatives considered

- **Raw `process.env` access** — no validation, no types, errors surface
  at first use rather than at boot. Rejected as the status quo this
  decision moves away from.
- **A single flat config object/class** — simpler to write initially, but
  couples unrelated domains (a Redis field change touching the same file
  as an email field change) and makes per-domain testing (see
  `database.config.spec.ts`) awkward.
- **Zod or another schema library instead of `class-validator`** —
  arguably nicer inference, but `class-validator`/`class-transformer` are
  already required by NestJS's own `ValidationPipe` conventions, so this
  keeps one validation approach for both env config and request DTOs
  rather than two.

## Consequences

- **Easier**: a missing/malformed env var is a clear, boot-time crash
  with the exact property and constraint named — not a silent `undefined`
  three services deep. Each domain is independently testable.
- **Harder**: adding a config value is a few more steps than
  `process.env.X` (class field + decorators + `.env.example` entry +
  spec) — deliberate friction in exchange for the above guarantee.
- **Forecloses**: reading config from anywhere other than the designated
  `.env` file at the designated path — CI and any other automation must
  write an actual env file rather than relying on job-level environment
  variables (see `.github/workflows/ci.yaml`).

## Revisit when

If config sourcing needs to support something `skipProcessEnv: true`
can't (e.g. pulling from a secrets manager at boot rather than a
mounted/generated file) — at that point, the loader mechanism (not the
per-domain class structure) is what needs to change.
