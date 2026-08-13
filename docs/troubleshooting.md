# Troubleshooting

## App won't boot: "Configuration validation failed"

A required env var is missing/invalid, or the wrong `.env` file is being
read. Check:

- Are you running with `NODE_ENV=test`? `CoreModule` reads
  `.env.test.local` in that case, **not** `.env` (see
  [Configuration](./configuration.md)).
- `skipProcessEnv: true` means variables set in your shell or CI job
  config are **ignored** — only the `.env` file's contents count. Setting
  `DB_URL=... pnpm start` will not work; put it in the file.
- The error message lists exactly which property and constraint failed
  (`validate-config.ts`'s `formatValidationErrors`) — start there.

## `pnpm run test:e2e` fails immediately, unrelated to my change

E2E tests boot the real `AppModule`, which needs a real Postgres and
Redis reachable via `.env.test.local` (see
[Testing](./testing.md#e2e-tests)). Confirm:

- `.env.test.local` exists and points at running services
  (`pnpm run docker:up` starts them locally).
- `DB_ENABLE_SSL` matches your local Postgres — it defaults to `true`;
  the bundled `docker-compose.yaml` Postgres doesn't terminate TLS, so
  local `.env.test.local` needs `DB_ENABLE_SSL=false` (same as
  `.env.example`).

## CORS requests are being rejected in production

- Confirm `APP_CORS_ORIGINS` is set to your actual frontend origin(s), not
  left at a `false`/empty default (which closes CORS entirely).
- If you're sending credentials (cookies) cross-origin, `*` will never
  work — this app sends `credentials: true` (`main.ts`), and browsers
  reject the `*` + credentialed-request combination regardless of server
  config. Use an explicit origin list.

## Rate limiting seems to not be working / is too aggressive

- Check `RATE_LIMIT_ENABLED` — `false` still runs the guard but always
  allows requests through (`skipIf`), it doesn't remove the guard.
- Check `APP_TRUST_PROXY` — if it's misconfigured for your deployment
  topology, every request may appear to come from your load balancer's
  IP (over-aggressive limiting hits everyone at once) or a client can
  spoof `X-Forwarded-For` to dodge their own limit entirely. See
  [`SECURITY.md`](../SECURITY.md#trusted-proxy-app_trust_proxy).

## A `GET` endpoint returns stale data after a write

Two independent caching layers exist — see
[Caching](./caching.md#http-response-caching-skipcache):

- If you're using `CacheService` with manual invalidation in your
  service, make sure the controller is `@SkipCache()`'d — otherwise the
  global `HttpCacheInterceptor` is _also_ caching the raw response by
  URL, uncoordinated with your service-level invalidation.
- If relying on the interceptor alone (no `CacheService` involved),
  remember it has no invalidation mechanism at all — it just expires
  after `CACHE_TTL`. Any resource with writes affecting a GET's response
  needs the explicit `CacheService` pattern instead.

## A 404 keeps happening even after creating the resource

If a `findOne()`-style method caches its result with `wrap()`/`set()`
including the not-found case, a stored `null`/undefined value looks like
a normal cache hit to `cache-manager` — the 404 will keep returning until
`CACHE_TTL` expires. Don't cache negative lookups; see the pattern in
`TodoService.findOne()` ([Caching](./caching.md#cache-invalidation-pattern)).

## Database connection fails with an SSL/TLS error

- Connecting to a managed Postgres provider that requires TLS but
  `DB_ENABLE_SSL` is `false`: set it `true` (the default).
- Connecting to a provider whose certificate doesn't chain to a public
  CA (some managed hosts): set `DB_SSL_REJECT_UNAUTHORIZED=false` rather
  than disabling SSL — see [`SECURITY.md`](../SECURITY.md#database-tls-db_enable_ssl-db_ssl_reject_unauthorized).
- Connecting to the local `docker-compose.yaml` Postgres, which doesn't
  terminate TLS at all: set `DB_ENABLE_SSL=false`.

## OpenTelemetry / tracing isn't showing anything

- Confirm `OTEL_SDK_DISABLED` isn't set to `true`.
- Confirm the OTLP endpoint is reachable — locally, `docker-compose.yaml`'s
  `otel-lgtm` service exposes it on `4317` (gRPC) / `4318` (HTTP);
  Grafana itself is on `GRAFANA_PORT` (default `3001`).
- The SDK is started at the very top of `main.ts`, before `AppModule` is
  imported — if you've refactored bootstrap and this ordering changed,
  auto-instrumentation may have missed patching some modules. Don't move
  `sdk.start()` below other imports.

## Swagger/Scalar docs (`/docs`) return 404

Only mounted when `NODE_ENV=development` (`main.ts`) — this is
intentional (see [API Documentation](./api-documentation.md#scalar-dev-only)),
not a bug, for every other environment.
