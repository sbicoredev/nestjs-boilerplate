# Rate Limiting

## How it's wired

`RatelimiterModule` (`core/ratelimiter/`) registers a global
`ThrottlerGuard` (via `APP_GUARD`), backed by `@nestjs/throttler` with
`RedisThrottlerStorage` — so limits are enforced consistently across all
app replicas, not per-process.

It uses its **own** Redis connection (`REDIS_RATELIMITER_CONN`, on
`RATE_LIMIT_DB`), separate from the cache's Redis connection — see
[Caching](./caching.md#redis-connection) for why that separation
matters.

## Configuration

All via `RatelimiterConfig` (`configs/ratelimiter.config.ts`):

| Env var                     | Meaning                                   | Default |
| --------------------------- | ----------------------------------------- | ------- |
| `RATE_LIMIT_ENABLED`        | master on/off switch                      | `true`  |
| `RATE_LIMIT_TTL`            | window size, seconds                      | `60`    |
| `RATE_LIMIT_MAX`            | max requests per window                   | `100`   |
| `RATE_LIMIT_BLOCK_DURATION` | extra block time after exceeding, seconds | `60`    |
| `RATE_LIMIT_DB`             | Redis DB index (0–100)                    | `1`     |

`RATE_LIMIT_ENABLED=false` doesn't unregister the guard — it uses
Throttler's `skipIf` so the guard still runs but always allows the
request through. Useful for load testing or a temporary incident
mitigation without a redeploy.

**The defaults in `.env.example` (`RATE_LIMIT_TTL=10`, `RATE_LIMIT_MAX=3`)
are intentionally strict for local testing of the limiter itself — not a
production recommendation.** Set real values per environment; the CI
workflow's e2e job sets `RATE_LIMIT_ENABLED=false` entirely so tests
aren't rate-limited against each other.

## Per-route overrides

This boilerplate applies one global throttler tier. If a specific route
needs a different (stricter/looser) limit, use `@nestjs/throttler`'s own
decorators on top of the global guard:

```ts
import { Throttle, SkipThrottle } from "@nestjs/throttler";

@Throttle({ default: { limit: 5, ttl: 60_000 } })
@Post("sign-in")
signIn() { /* ... */ }

@SkipThrottle()
@Get("public-status")
publicStatus() { /* ... */ }
```

## Client IP accuracy

Rate limiting is IP-based by default, so its accuracy depends entirely on
`APP_TRUST_PROXY` being configured correctly for your deployment — see
[`SECURITY.md`](../SECURITY.md#trusted-proxy-app_trust_proxy). A
misconfigured trust-proxy setting is the most common way a rate limiter
silently stops working (every request appears to come from the load
balancer's IP, or a client can spoof `X-Forwarded-For` to reset their own
limit).
