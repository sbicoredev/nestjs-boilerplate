# Getting Started

## Prerequisites

- Node.js `>=24.18.0` and [pnpm](https://pnpm.io/installation) `>=11.13`
  (see `package.json#engines`)
- Docker + Docker Compose, for local Postgres, Redis, Mailpit, and the
  observability stack

## 1. Clone and install

```bash
git clone <your-fork-url>
cd nestjs-boilerplate
pnpm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Every variable in `.env.example` is validated at boot by the config layer
(see [Configuration](./configuration.md)) — the app refuses to start if
a required one is missing or malformed, rather than failing later at first
use. Adjust `DB_URL`, `REDIS_URL`, etc. if you're not using the bundled
Docker Compose services.

## 3. Start local infrastructure

```bash
pnpm run docker:up   # Postgres, Redis, RedisInsight, Mailpit, Grafana/Loki/Tempo/Prometheus
```

This reads `.env.docker` (local-only default credentials — never reused in
production). Services and ports:

| Service      | Purpose                               | Local port                 |
| ------------ | ------------------------------------- | -------------------------- |
| Postgres     | primary database                      | `5432`                     |
| Redis        | cache + rate limiter                  | `6379`                     |
| RedisInsight | Redis GUI                             | `5540`                     |
| Mailpit      | SMTP catcher + web UI                 | `1025` (SMTP), `8025` (UI) |
| Grafana      | dashboards over Loki/Tempo/Prometheus | `3001`                     |

Tear down with `pnpm run docker:down`.

## 4. Run database migrations

The app never runs migrations automatically at boot (see
[Database & Migrations](./database.md) for why). Run them explicitly —
this creates the tables the reference `todo` feature needs:

```bash
pnpm run migration:run
```

Alternatively, for local iteration only, set `DB_SYNC=true` in your `.env`
(it ships as `false` in `.env.example`) to let TypeORM sync the schema
from entities directly — convenient for prototyping, but `synchronize` is
force-disabled outside `development` regardless of this flag (see
`core/database/database.module.ts`), so don't rely on it past early local
work, and prefer running the migration above.

## 5. Run the app

```bash
pnpm run start:dev   # watch mode
```

- App: `http://localhost:3000/api`
- API docs (Scalar, dev-only): `http://localhost:3000/docs`
- Health: `http://localhost:3000/health`

## 6. Verify

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:e2e   # needs Postgres + Redis reachable, see docs/testing.md
```

## Next

- [Architecture](./architecture.md) for how the pieces fit together
- [Adding a Feature Module](./adding-a-feature-module.md) to start building
