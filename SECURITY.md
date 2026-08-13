# Security

This document describes the security defaults this boilerplate ships with, and
what you're expected to configure per-environment. It does not cover
application-level authorization/authentication — see the README's
"Not yet included" note; that's on you to add.

## Reporting a vulnerability

If you find a vulnerability in this boilerplate itself, please open a private
report (e.g. GitHub's "Report a vulnerability" flow) rather than a public
issue.

## Trusted proxy (`APP_TRUST_PROXY`)

`app.set('trust proxy', ...)` in `main.ts` is driven entirely by
`APP_TRUST_PROXY` — it is never hardcoded to `true`. Setting it to `true`
blindly would make Express trust the `X-Forwarded-For` header from *any*
client, which lets a caller spoof its own source IP and defeat IP-based rate
limiting.

- Behind a single reverse proxy / load balancer you control (nginx, ALB,
  Cloudflare): set this to the proxy's IP, or `loopback` for a proxy on the
  same host.
- Not behind a proxy: leave it `false`.
- Multiple proxy hops: a comma-separated list, evaluated in order.

## CORS (`APP_CORS_ORIGINS`)

Defaults closed (`false`) unless explicitly configured. Set a comma-separated
allow-list of exact origins for production — avoid `*` for any endpoint that
accepts credentials (this app sends `credentials: true`, so `*` and
credentialed requests are mutually exclusive per the CORS spec and most
browsers will reject the combination anyway).

## Database TLS (`DB_ENABLE_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`)

`DB_ENABLE_SSL` defaults to `true` — most managed Postgres providers require
TLS on the connection. Set it to `false` only for local/dev databases that
don't terminate TLS (this is what `.env.example` does, since the bundled
`docker-compose.yaml` Postgres doesn't).

If your provider issues a certificate that doesn't chain to a public CA in
Node's trust store (some managed hosts do this), set
`DB_SSL_REJECT_UNAUTHORIZED=false` rather than disabling SSL entirely — you
still get encryption in transit, just without full chain verification.

## Rate limiting

Global request throttling via `@nestjs/throttler`, backed by its own Redis
connection (`RATE_LIMIT_DB`), independent of the app cache's Redis
connection. Tune `RATE_LIMIT_TTL` / `RATE_LIMIT_MAX` / `RATE_LIMIT_BLOCK_DURATION`
per environment; the defaults in `.env.example` are intentionally strict for
local testing, not a production recommendation.

## Secrets

No secrets are committed to this repo. `.env`, `.env.*.local` are gitignored.
`.env.docker` holds only local-only default credentials for
`docker-compose.yaml` and is not meant to be reused outside local dev. In
production, inject `DB_URL`, `REDIS_URL`, `SENDGRID_API_KEY`, etc. via your
platform's secret manager, not a checked-in file.

## HTTP headers

`helmet` is applied with a CSP that's scoped to allow the Scalar/Swagger UI's
CDN assets. That UI is only mounted in `development` (see `main.ts`) — if you
enable it elsewhere, re-check the CSP is still appropriate for your deployment.

## Dependency updates

Dependabot (`.github/dependabot.yml`) opens weekly PRs for npm, GitHub
Actions, and Docker base image updates. CI (`.github/workflows/ci.yaml`)
runs lint/typecheck/unit tests on every PR and e2e tests against real
Postgres/Redis service containers.
