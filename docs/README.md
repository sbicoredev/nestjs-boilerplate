# Documentation

Reference documentation for this boilerplate, organized by concern. Start
with **Getting Started**, then read **Architecture** for the mental model
before diving into any one subsystem.

| #   | Doc                                                        | What it covers                                                  |
| --- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | [Getting Started](./getting-started.md)                 | Prerequisites, local setup, running the app                     |
| 2   | [Architecture](./architecture.md)                       | Layering (`core` vs `modules`), module graph, request lifecycle |
| 3   | [Configuration](./configuration.md)                     | The typed config layer, adding a new env var                    |
| 4   | [Database & Migrations](./database.md)                  | TypeORM setup, writing migrations, seeding                      |
| 5   | [Caching](./caching.md)                                 | Two-tier cache, `CacheService`, HTTP response caching           |
| 6   | [Rate Limiting](./rate-limiting.md)                     | Redis-backed throttling                                         |
| 7   | [Observability](./observability.md)                     | Logging, request correlation, tracing/metrics                   |
| 8   | [Internationalization](./internationalization.md)       | `nestjs-i18n`, adding translations                              |
| 9   | [Email](./email.md)                                     | `EmailService`, templates, providers                            |
| 10  | [Error Handling](./error-handling.md)                   | Exception filters, the `ApiErrorResponse` shape                 |
| 11  | [API Documentation](./api-documentation.md)             | OpenAPI/Scalar setup                                            |
| 12  | [Testing](./testing.md)                                 | Unit vs e2e, running tests, CI                                  |
| 13  | [Deployment](./deployment.md)                           | Docker image, environment, health checks                        |
| 14  | [Adding a Feature Module](./adding-a-feature-module.md) | Step-by-step, using `todo` as the template                      |
| 15  | [Troubleshooting](./troubleshooting.md)                 | Common errors and their fixes                                   |

See also, at the repo root:

- [`README.md`](../README.md) — project overview, feature list, quick start
- [`SECURITY.md`](../SECURITY.md) — security defaults and reporting

## Architecture Decision Records

Significant, hard-to-reverse decisions are recorded under [`adr/`](./adr/),
one file per decision, using the format in
[`adr/0000-template.md`](./adr/0000-template.md). Add a new ADR when you
make a decision future contributors will otherwise re-litigate — don't
retroactively write one for everything that already exists.
