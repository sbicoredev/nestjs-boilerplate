# Deployment

## Docker image

```bash
docker build -t nestjs-boilerplate .
docker run -p 3000:3000 --env-file .env nestjs-boilerplate
```

Multi-stage build (`Dockerfile`):

1. **`deps`** — install all dependencies (incl. dev) needed to build.
2. **`build`** — `pnpm run build` (TypeScript → `dist/`), then
   `pnpm prune --prod` to drop dev dependencies.
3. **`runner`** — minimal `node:24-alpine` image: `dist/`, production
   `node_modules`, `package.json`, plus the i18n locale files and email
   `.hbs` templates (`nest build` doesn't emit non-`.ts` assets on its
   own for a plain `node dist/main` runtime — see
   [Email](./email.md#templates)). Runs as a non-root user (`nestjs`,
   uid `1001`).

`docker-compose.yaml` at the repo root does **not** build/run the app
itself — it only provisions local dependencies (Postgres, Redis,
Mailpit, observability stack). Run the app with `pnpm run start:dev`
locally, or via the `Dockerfile` image for a closer-to-production run.

## Required environment variables

See `.env.example` for the full, documented list — every one of these is
validated at boot (see [Configuration](./configuration.md)). At
minimum for a production deploy: `NODE_ENV=production`, `DB_URL`,
`REDIS_URL`, `APP_CORS_ORIGINS`, `APP_TRUST_PROXY` (set to your actual
load balancer/proxy, not left at the local `loopback` default — see
[`SECURITY.md`](../SECURITY.md#trusted-proxy-app_trust_proxy)).

## Migrations before deploy

Migrations are **not** run automatically at app boot (see
[Database & Migrations](./database.md#why-migrations-arent-run-automatically-at-boot)).
Run `pnpm run migration:run` as an explicit step in your deploy pipeline,
before the new app version starts receiving traffic — not from inside the
running container.

## Health checks

Three endpoints (`HealthController`), all under the global `/api` prefix
by default (i.e. `/health`, `/readyz`, `/livez` — adjust your
probe paths accordingly, or exclude health routes from
`app.setGlobalPrefix()` if your platform expects unprefixed paths):

| Endpoint  | Checks                                                 | Use for                        |
| --------- | ------------------------------------------------------ | ------------------------------ |
| `/health` | Postgres, Redis (rate-limiter connection), memory heap | Full diagnostic / dashboards   |
| `/readyz` | Postgres only                                          | Kubernetes **readiness** probe |
| `/livez`  | Nothing — static `{ status: "ok" }`                    | Kubernetes **liveness** probe  |

**Why `/livez` is deliberately dumb**: liveness should only answer "is
the process alive," not "are dependencies reachable." A downed database
should fail _readiness_ (pulling the pod out of load-balancer rotation
until it recovers) — not _liveness_ (which would restart the pod, and a
restart doesn't fix a database outage).

Example Kubernetes probe config:

```yaml
livenessProbe:
  httpGet: { path: /livez, port: 3000 }
  periodSeconds: 10
readinessProbe:
  httpGet: { path: /readyz, port: 3000 }
  periodSeconds: 5
```

The `Dockerfile`'s own `HEALTHCHECK` also targets `/livez` — for a plain
`docker run` without an orchestrator's probe config, this is what
`docker ps` / `docker inspect` report on.

## Graceful shutdown

`setupGracefulShutdown()` (`@tygra/nestjs-graceful-shutdown`) runs in
every environment except `development` (`main.ts`) — on `SIGTERM`, it
stops accepting new connections and lets in-flight requests finish before
the process exits. This is what makes rolling deploys/pod termination
not drop in-flight requests, **provided your orchestrator's termination
grace period is long enough** for your slowest typical request.

## Logging in production

Set `APP_LOG_SERVICE=opentelemetry` to route logs through the OTLP
pipeline instead of `pino-pretty` console output — see
[Observability](./observability.md#logging-pino).

## What this doc doesn't cover

Actual infrastructure provisioning (your specific cloud provider, load
balancer, Kubernetes manifests, secrets manager) is deployment-target
specific and outside this boilerplate's scope — the pieces above are
what the _application_ expects from its environment, wherever you run it.
