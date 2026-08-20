# Observability

Three pillars, all wired in before the app even starts handling requests.

## Logging (Pino)

`core/observability/logger/logger.module.ts` configures `nestjs-pino`:

- **Structured JSON** in general; pretty-printed via `pino-pretty` when
  `APP_LOG_SERVICE=console` (the local-dev default).
- **Request correlation**: every log line within a request's lifecycle
  carries that request's ID (see [Request context](#request-context) below).
- **Status-derived log level** for HTTP request logs: 5xx → `error`, 4xx →
  `warn`, else `info` (`customLogLevel` in `LoggerModule`).
- **Automatic secret redaction** — `loggingRedactPaths` in
  `logger.module.ts` masks (censors as `**GDPR COMPLIANT**`):
  `authorization`/`proxy-authorization`/`x-api-key` headers, and
  `req.body.{token,refreshToken,email,password,oldPassword,newPassword}`.
  **This list only covers inbound request logging** — it does not redact
  values you log yourself elsewhere in application code. See
  `EmailService.send()` for an example of deliberately _not_ logging a
  recipient address for exactly this reason; follow that pattern for any
  other PII you'd otherwise be tempted to log directly.
- Health check routes (`/health{z}`, `/ready{z}`, `/live{z}`) are excluded
  from automatic HTTP request logging (`exclude` in the Pino config) to
  avoid flooding logs with probe traffic.

Getting a logger in your own code: inject `Logger` from `@nestjs/common`
(NestJS's own, not Pino's directly) — `loggerProvider` in this module
provides a `TRANSIENT`-scoped instance pre-named after the injecting
class via `INQUIRER`, so `new Logger("YourService")` boilerplate isn't
needed:

```ts
constructor(private readonly logger: Logger) {}
this.logger.error("something failed", stack);
```

### Request context

`core/http-context/` (`HttpContextModule.forRoot()`, global) uses
`nestjs-cls` to give every request an ID — taken from the incoming
`x-request-id` header if present, otherwise generated (`<uuidv7>`) —
and makes it available anywhere via DI (`HTTP_CONTEXT` token /
`HttpContext` interface), without threading it through every function
signature by hand:

```ts
constructor(@Inject(HTTP_CONTEXT) private readonly ctx: HttpContext) {}
this.ctx.getRequestId();
```

`AppService.getOk()` shows this pattern. The same request ID shows up in
every log line for that request, and in the `requestId` field of every
`ProblemDetails` error response (see [Error Handling](./error-handling.md))
— so a client-reported error can be grep'd straight to its full
server-side log trail.

## Tracing & metrics (OpenTelemetry)

`core/observability/opentelemetry.ts` configures a `NodeSDK` with
OTLP export (traces + metrics) and `getNodeAutoInstrumentations()` — this
auto-instruments Express, `pg`, Redis clients, etc. without manual
instrumentation calls in your code.

**It's started before Nest itself** (`sdk.start()` at the very top of
`main.ts`, before `AppModule` is even imported) — auto-instrumentation
needs to patch modules before they're `require`d elsewhere, so this
ordering matters; don't move it.

Notable tuning:

- Batch export settings scale up in production (bigger queues/batches,
  longer export intervals) vs. development (small, fast, easier to see
  spans quickly while developing).
- `fs` and `dns` instrumentation are disabled — high-volume, low-signal.
- HTTP instrumentation ignores `/health`, `/metrics`, `/favicon.ico` so
  probe/scrape traffic doesn't pollute traces.
- Graceful shutdown (`SIGTERM`/`SIGINT`) flushes pending spans/metrics
  before exit, with a 10s hard timeout so shutdown can't hang forever.

Set `OTEL_SDK_DISABLED=true` to fully disable (useful for local dev
without the observability stack running, or in CI — the workflow in this
repo sets it).

### Local observability stack

`docker-compose.yaml`'s `otel-lgtm` service (Grafana `otel-lgtm` image)
bundles Grafana + Loki (logs) + Tempo (traces) + Prometheus (metrics) with
zero external config — traces/metrics land via OTLP on `4317`/`4318`,
Grafana's on `${GRAFANA_PORT}` (default `3001`). Anonymous admin access is
enabled for local convenience only (`GF_AUTH_ANONYMOUS_ENABLED=true` in
`docker-compose.yaml`) — never do this outside local dev.

A direct-scrape `/metrics` endpoint is also mentioned in the project's
feature list for setups that run Prometheus scraping rather than the OTLP
collector pipeline — check `core/observability/` for the current wiring
if you need this without the full LGTM stack.

## Adding your own spans/metrics

Use `@opentelemetry/api`'s `trace.getTracer()` / `metrics.getMeter()`
directly in application code where auto-instrumentation isn't enough
(e.g. a custom business-logic span) — the SDK is already initialized
globally by the time any of your code runs.
