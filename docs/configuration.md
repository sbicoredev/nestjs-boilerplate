# Configuration

## How it works

Every configuration domain (`app`, `database`, `redis`, `cache`,
`ratelimiter`, `email`) is a `class-validator`-decorated class in
`src/configs/*.config.ts`, registered with `@nestjs/config`'s
`registerAs()`. On boot, `CoreModule`'s `ConfigModule.forRoot()`:

- reads **only** `.env` (or `.env.test.local` under `NODE_ENV=test`) — note
  `skipProcessEnv: true`, meaning ambient shell/CI environment variables are
  **ignored**; everything must come from the env file. This is why CI
  writes an actual `.env.test.local` file rather than setting job-level
  `env:` vars (see `.github/workflows/ci.yaml`).
- runs each config class through `validatedConfig()`
  (`common/utils/validate-config.ts`), which uses
  `plainToInstance` + `validateSync` and **throws** — crashing the boot —
  if anything fails validation.
- caches the result (`cache: true`) and exposes it globally via
  `ConfigService`.

This means a missing or malformed env var is a boot-time crash with a
readable error, not a runtime `undefined` bug three services deep.

## Consuming config

Inject `ConfigService<Configurations, true>` (the `Configurations` type in
`common/types.ts` maps each token to its config class) and use
`.get('domain.field', { infer: true })`, or inject a domain's `KEY`
directly in a factory:

```ts
// in a *Async module factory
useFactory: (dbCfg: Configurations["database"]) => ({ url: dbCfg.url }),
inject: [databaseConfig.KEY],
```

```ts
// in an injectable service
constructor(private readonly config: ConfigService<Configurations, true>) {}
someMethod() {
  const prefix = this.config.get("app.prefix", { infer: true });
}
```

## Adding a new config value

1. Add the field to the relevant class in `src/configs/<domain>.config.ts`
   with `@Expose({ name: "ENV_VAR_NAME" })` and the appropriate
   `class-validator` decorators. Give it a sensible default with
   `@IsOptional()` unless it must be required.
2. For boolean env vars, use the `@AsBoolean()` decorator
   (`common/decorators/as-boolean.decorator.ts`) — env vars are strings,
   and `@IsBoolean()` alone won't coerce `"true"`/`"false"` for you.
3. Document it in `.env.example` with a comment on what it does and its
   default.
4. Add/extend the matching `*.config.spec.ts` test — see the pattern in
   `src/configs/database.config.spec.ts`: assert the default, assert
   required-ness (or lack of it), assert type coercion, assert range
   validation.

## Adding a new config domain

If you're adding a whole new subsystem (not just a field on an existing
one):

1. Create `src/configs/<domain>.config.ts`, following an existing file's
   shape.
2. Add its token to `common/constants/config.ts`.
3. Add it to the `Configurations` type in `common/types.ts`.
4. Register it in `CoreModule`'s `ConfigModule.forRoot({ load: [...] })`.

## Reference: current config domains

| Domain       | Token         | File                    | Key fields                                            |
| ------------ | ------------- | ----------------------- | ----------------------------------------------------- |
| App          | `app`         | `app.config.ts`         | environment, port, prefix, CORS, trust proxy, logging |
| Database     | `database`    | `database.config.ts`    | `DB_URL`, pool size, `DB_ENABLE_SSL`                  |
| Redis        | `redis`       | `redis.config.ts`       | `REDIS_URL`, connect timeout                          |
| Cache        | `cache`       | `cache.config.ts`       | TTL, LRU size, Redis DB index                         |
| Rate limiter | `ratelimiter` | `ratelimiter.config.ts` | enabled, TTL, limit, block duration, Redis DB index   |
| Email        | `email`       | `email.config.ts`       | provider, from address/name, SMTP URL                 |

## Notable patterns worth knowing about

- **`AppConfig.corsOrigins`** goes through `resolveCorsOrigin()`, which
  auto-adds `127.0.0.1` equivalents for any `localhost` origin and `www.`
  variants for any `https://` origin — so you don't have to list every
  variant by hand in `.env`.
- **`AppConfig.trustProxy`** goes through `resolveTrustProxy()`, parsing
  `"true"/"false"`, a bare number, a comma-separated list, or a raw string
  (CIDR/keyword like `loopback`) — passed straight to Express's `trust
proxy` setting. See [`SECURITY.md`](../SECURITY.md#trusted-proxy-app_trust_proxy)
  for why this is never hardcoded `true`.
- **`DatabaseConfig.enableSSL`** defaults to `true` (most managed Postgres
  providers require TLS); `.env.example` sets it `false` only because the
  bundled `docker-compose.yaml` Postgres doesn't terminate TLS locally.
