# NestJS Boilerplate

A production-grade NestJS starter for backend services — built with observability, resilience, and operational readiness in from day one, not bolted on later.

Instead of a bare `nest new` scaffold, this ships with config validation, a two-tier cache, Redis-backed rate limiting, request-correlated structured logging, distributed tracing/metrics with a full local Grafana stack, i18n, email, and health checks already wired together — so new feature work can start immediately instead of re-solving the same infrastructure problems every project needs.

📖 **Full documentation:** [`docs/`](./docs/README.md) — architecture, per-subsystem guides, and [ADRs](./docs/adr/) for the notable decisions baked into this starter.

## Features

- **PostgreSQL via TypeORM** — connection pooling, SSL, and dev-only schema sync configured through the same typed config layer, with real migrations (not just schema sync) for anything beyond local dev.
- **Two-tier caching** — in-memory (LRU) + Redis, behind one small `CacheService`, with a centralized cache-key registry.
- **Redis-backed rate limiting** — global request throttling via `@nestjs/throttler`, on its own dedicated Redis connection.
- **Request context & correlation** — every request gets an ID (from `x-request-id` or generated), available anywhere via DI and threaded through every log line and trace.
- **Structured logging** — (Pino) with request-ID correlation and automatic secret redaction (auth headers, tokens, passwords).
- **Distributed tracing & metrics** — OpenTelemetry auto-instrumentation, OTLP export, with a ready-to-run local observability stack (Grafana + Loki + Tempo + Prometheus) _and_ a direct-scrape `/metrics` endpoint for setups that don't run the collector stack.
- **Global error handling** — consistent `ProblemDetails` shape across all errors and validation failures
- **Health checks** — `/health` (full: Postgres, Redis, memory), `/readyz` (Postgres only — k8s-probe ready), `/livez` (static; liveness intentionally doesn't check dependencies).
- **Internationalization** — `nestjs-i18n` with query/header-based locale resolution and generated TypeScript types for translation keys.
- **Validated configuration** — per-domain config classes (`class-validator`), fail-fast on boot if env vars are missing/invalid
- **Email** — working `EmailService.send()` today, over SMTP in dev (via Mailpit) or SendGrid in production (`EMAIL_PROVIDER=sendgrid`, via SMTP relay — no extra SDK dependency).
- **OpenAPI docs** — via Scalar, auto-generated from DTOs (dev only)
- **Security defaults** — Helmet, configurable CORS, trusted-proxy config (actually enforced — see [`SECURITY.md`](SECURITY.md)), global validation with a strict whitelist policy, gzip/Brotli response compression.
- **Graceful shutdown** — in non-development environments.
- **Biome/Ultracite** — linting & formatting, Husky + lint-staged + commitlint (Conventional Commits)
- **Testing** — Vitest unit + supertest e2e testing set up out of the box, run automatically on every PR via GitHub Actions CI
- **Docker** — a production `Dockerfile` for the app itself, plus Docker Compose for local infra: Postgres, Redis, RedisInsight, Mailpit, and an observability stack

> ⚠️ **Not yet included:** authentication. The OpenAPI setup already reserves bearer/API-key security schemes for it, but no guards, strategies, or user model exist yet — that's the next thing most projects built on this starter will need to add.

## Tech stack

| Concern                       | Choice                                                              |
| ----------------------------- | ------------------------------------------------------------------- |
| Framework                     | [NestJS](https://nestjs.com) 11 (Express)                           |
| Language                      | TypeScript (strict)                                                 |
| Package manager               | [pnpm](https://pnpm.io)                                             |
| Database                      | PostgreSQL + TypeORM                                                |
| Cache                         | `cache-manager` + `cacheable` + `@keyv/redis` (Redis-backed)        |
| Rate limiting                 | `@nestjs/throttler` + `@nestjs-redis/throttler-storage`             |
| Logging                       | `nestjs-pino` (structured JSON, pretty-printed in dev)              |
| Tracing / Metrics             | OpenTelemetry SDK, OTLP export                                      |
| Observability backend (local) | Grafana, Loki, Tempo, Prometheus                                    |
| i18n                          | `nestjs-i18n`                                                       |
| Email                         | `@nestjs-modules/mailer` + Handlebars, Mailpit (local)              |
| API docs                      | `@nestjs/swagger` + Scalar                                          |
| Validation                    | `class-validator` / `class-transformer`                             |
| Health checks                 | `@nestjs/terminus`                                                  |
| Security                      | `helmet`, CORS, global `ValidationPipe`                             |
| Testing                       | Vitest + Supertest                                                  |
| Lint/format                   | [Biome](https://biomejs.dev) via [Ultracite](https://ultracite.dev) |
| Git hooks                     | Husky, Commitlint (Conventional Commits), lint-staged               |
| Containers                    | Docker / docker-compose                                             |

## Project structure

```text
src/
├── main.ts                   # bootstrap: OTel init, security, versioning, global pipes/filters
├── app.module.ts             # root module
├── configs/                  # one validated, typed config class per domain
├── common/                   # shared constants, decorators, DTOs, utils, global types
├── core/                     # cross-cutting infrastructure, imported once via CoreModule
│   ├── cache/                # two-tier cache (in-memory + Redis)
│   ├── database/             # TypeORM setup (the app's actual DB connection)
│   ├── email/                # mailer + Handlebars templates + EmailService
│   ├── filters/              # global exception handling
│   ├── http-context/         # request-scoped context (request ID, etc.)
│   ├── internationalization/ # i18n setup + translation files
│   ├── observability/        # OpenTelemetry (OTLP + direct-scrape /metrics) + Pino logging
│   └── ratelimiter/          # Redis-backed rate limiting
├── modules/                  # feature modules — this is where product work happens
│   ├── health/               # liveness/readiness/health endpoints
│   └── todo/                 # reference CRUD module — copy this pattern for new features
database/                     # standalone TypeORM CLI: migrations (not part of the app's own DI graph)
test/                         # e2e tests

Dockerfile                       # multi-stage production image for the app itself
.github/workflows/ci.yaml        # lint/typecheck/unit always; e2e against real Postgres/Redis
.github/dependabot.yaml
```

## Prerequisites

- Node.js (LTS) and [pnpm](https://pnpm.io/installation)
- Docker + Docker Compose (for local Postgres, Redis, mail testing, and the observability stack)

## Getting started

```bash
# 1. Clone the repository
git clone https://github.com/sbicoredev/nestjs-boilerplate.git
cd nestjs-boilerplate

# 2. Install dependencies
pnpm install

# 3. Copy environment variables and adjust as needed
cp .env.example .env

# 4. Start local infrastructure (Postgres, Redis, RedisInsight, Mailpit, observability stack)
pnpm run docker:up

# 5. Run database migrations
pnpm run migration:run

# 6. Start the app in watch mode
pnpm run start:dev
```

The app starts on the port set by `APP_PORT` (default `3000`), under the route prefix set by `APP_ROUTE_PREFIX` (default `/api`).

With `DB_SYNC=true` (the `.env.example` default), the schema is created automatically for local dev. For anything beyond local dev, use real migrations instead — (`pnpm run migration:run`).

Running the e2e suite locally also needs a `.env.test.local` (git-ignored) — copy the template first: `cp .env.test.local.example .env.test.local`.

Once running:

- **API docs (Scalar):** `http://localhost:3000/docs` (development only)
- **Health check:** `http://localhost:3000/health`
- **Mailpit (local email inbox):** `http://localhost:8025`
- **RedisInsight:** `http://localhost:<REDIS_INSIGHT_PORT>`
- **Grafana:** `http://localhost:<GRAFANA_PORT>` (traces, logs, and metrics, pre-correlated by request ID)

## Environment variables

All configuration is validated at startup — see `.env.example` for the full list with inline descriptions, grouped as:

- **Application** — name, port, route prefix, CORS origins, trust proxy, log level/service, fallback language
- **Database** — connection URL, SSL, pool size, dev-only schema sync
- **Redis** — connection URL, timeout
- **Cache** — TTL, in-memory LRU size, logical DB index
- **Rate limiting** — enabled flag, window, limit, block duration, logical DB index
- **Email** — provider, sender identity, SMTP URL

`.env.docker` holds the matching local defaults consumed by `docker-compose.yaml` (ports, credentials for Postgres/Redis/Grafana).

## Available scripts

| Command                              | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `pnpm run start:dev`                 | Start the app in watch mode                                     |
| `pnpm run start:debug`               | Start with the Node debugger attached                           |
| `pnpm run build`                     | Compile to `dist/`                                              |
| `pnpm run start:prod`                | Run the compiled app                                            |
| `pnpm run typecheck`                 | Type-check without emitting                                     |
| `pnpm run lint`                      | Lint/format check (Biome via Ultracite)                         |
| `pnpm run lint:fix`                  | Auto-fix lint/format issues                                     |
| `pnpm run test`                      | Unit tests                                                      |
| `pnpm run test:watch`                | Unit tests, watch mode                                          |
| `pnpm run test:cov`                  | Unit tests with coverage                                        |
| `pnpm run test:e2e`                  | End-to-end tests                                                |
| `pnpm run migration:generate <path>` | Generate a migration from entity changes (needs a reachable DB) |
| `pnpm run migration:create <path>`   | Create an empty migration file to hand-write                    |
| `pnpm run migration:run`             | Apply pending migrations                                        |
| `pnpm run migration:revert`          | Roll back the last applied migration                            |
| `pnpm run migration:show`            | List migrations and their status                                |
| `pnpm run docker:up`                 | Start local infra + observability stack                         |
| `pnpm run docker:down`               | Stop local infra                                                |

## Testing

```bash
pnpm run test        # unit tests — no external services needed
pnpm run test:e2e    # end-to-end tests — needs Postgres + Redis running (pnpm run docker:up)
pnpm run test:cov    # coverage report
```

E2e tests run against a real database and Redis instance rather than mocks, and run serially since every test file shares that one instance of each. Requires a local `.env.test.local` (copy `.env.test.local.example`)

## Deployment

```bash
docker build -t nestjs-boilerplate:local .
```

A multi-stage `Dockerfile` builds a production image for the app itself (separate from `docker-compose.yaml`, which only provisions local _dependencies_). CI (`.github/workflows/ci.yaml`) runs lint/typecheck/unit tests on every PR, plus e2e tests against real Postgres/Redis service containers.

## Code quality & git workflow

- Formatting and linting are handled by **Biome** (via the Ultracite preset) — there's no ESLint or Prettier config here. Run `pnpm run check` or `pnpm run fix`.
- **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/), enforced by Commitlint.
- **Branch names** must match `<type>/<description>` (`feature`, `hotfix`, `bugfix`, `refactor`, `test`, `chore`, or `docs`), enforced by a pre-commit hook — e.g. `feature/user-profile`, `bugfix/cache-ttl`.
- `lint-staged` auto-fixes staged files at commit time.

## License

[MIT licensed](LICENSE).
