# Architecture

## Layering

```text
src/
├── main.ts          # bootstrap: OTel init, security, versioning, global pipes/filters
├── app.module.ts     # root module — wires CoreModule + feature modules together
├── configs/          # one validated, typed config class per domain
├── common/           # shared constants, decorators, DTOs, utils, global types
├── core/              # cross-cutting infrastructure, imported once via CoreModule
└── modules/           # feature modules — this is where product work happens
```

The rule of thumb: **`core/` knows nothing about `modules/`; `modules/`
depends on `core/`, never the other way round.** If you find yourself
importing something from a feature module into `core/`, that's a sign the
thing you're building belongs in `common/` or its own `core/` submodule
instead.

### `core/` — cross-cutting infrastructure

Everything here is registered once, in `CoreModule`, and (mostly) marked
`@Global()` so feature modules never need to import it directly:

| Submodule               | Responsibility                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `database/`             | The app's actual TypeORM connection (`DatabaseModule`)                                         |
| `cache/`                | Two-tier (memory + Redis) cache, `CacheService`, HTTP cache interceptor                        |
| `ratelimiter/`          | Redis-backed request throttling                                                                |
| `http-context/`         | Per-request context (request ID) via `nestjs-cls`                                              |
| `internationalization/` | `nestjs-i18n` setup                                                                            |
| `observability/`        | Pino logging + OpenTelemetry                                                                   |
| `email/`                | `EmailService`, Handlebars templates                                                           |
| `filters/`              | Global exception handling (not itself a module — providers registered directly in `AppModule`) |

See the per-topic docs (04–10) for how each of these actually works.

### `modules/` — feature/product code

This is where your application's actual domain logic lives. Two modules
ship out of the box:

- **`health/`** — liveness/readiness/health endpoints (see
  [Deployment](./deployment.md#health-checks))
- **`todo/`** — a reference CRUD module. Not a real feature — it exists to
  show the pattern (entity → DTOs → service → controller → module, with
  cache invalidation wired in) that [Adding a Feature
  Module](./adding-a-feature-module.md) walks through. Copy it, don't
  extend it.

### `common/`

Shared, stateless building blocks with no DI wiring of their own:
constants (`config.ts` tokens, `mappings.ts` enums-as-objects,
`security.ts` Helmet/CORS defaults, `problem-types.ts` RFC 9457 `type`
URIs), decorators (`@SkipCache()`, `@AsBoolean()`, `@IsCorsOrigin()`), the
`ProblemDetails` DTO, and small pure utilities (`validate-config.ts`,
`string-helper.ts`, `build-problem-details.ts`).

## Module graph

```text
AppModule
├── CoreModule
│   ├── ConfigModule            (global, envFilePath-based, fail-fast validation)
│   ├── InternationalizationModule
│   ├── DatabaseModule           (TypeORM)
│   ├── CacheModule              (global — memory + Redis)
│   ├── RatelimiterModule        (global APP_GUARD: ThrottlerGuard)
│   ├── HttpContextModule.forRoot()  (global — request ID via CLS)
│   ├── ObservabilityModule      (Pino logger)
│   └── EmailModule
├── HealthModule
└── TodoModule
```

`ObservabilityModule` is deliberately imported _after_ `HttpContextModule`
in `CoreModule` — the request-ID middleware needs to run before the HTTP
logger can include it in log lines.

## Request lifecycle

For a typical request (e.g. `POST /api/todos`):

1. **Helmet** middleware applies security headers.
2. **CLS middleware** (`HttpContextModule`) assigns/reads the request ID
   (`x-request-id` header, or generates one) and stores it in
   request-scoped storage.
3. **Pino HTTP middleware** logs the incoming request, tagged with that ID.
4. **`ThrottlerGuard`** (global) checks the Redis-backed rate limit.
5. **`HttpCacheInterceptor`** (global) checks/writes the response cache for
   GET requests — skipped entirely on routes/controllers marked
   `@SkipCache()`.
6. **Global `ValidationPipe`** (`APP_PIPE` in `app.module.ts`) validates
   and transforms the request body/query/params against the DTO;
   validation failures throw `UnprocessableEntityException` (422, not the
   Nest default 400 — see [Error Handling](./error-handling.md)).
7. **Controller → Service → Repository** — your feature code runs.
8. On error, the appropriate **exception filter**
   `GlobalExceptionFilter` builds the
   RFC 9457 `ProblemDetails` envelope, served as `application/problem+json`.
9. Response is logged (with status-derived level: 5xx → `error`, 4xx →
   `warn`, else `info`) and sent.

## Design principles this boilerplate follows

- **Fail fast at boot, not at first use.** Every config domain is
  validated with `class-validator` before the app starts serving traffic
  (see [Configuration](./configuration.md)).
- **Migrations, not `synchronize`, outside local dev.** Schema changes are
  reviewable and applied explicitly, never as a side effect of app
  startup or of multiple replicas racing each other (see
  [Database & Migrations](./database.md)).
- **Liveness ≠ readiness.** A downed dependency should pull a pod out of
  load-balancer rotation (readiness), not restart it (liveness) — see
  `HealthController` and [Deployment](./deployment.md).
- **One consistent error shape.** Every error response — validation
  failure, health-check failure, or unhandled exception — is the same
  RFC 9457 `ProblemDetails` envelope (`application/problem+json`), built
  once and layered on where needed (see
  [Error Handling](./error-handling.md)).
