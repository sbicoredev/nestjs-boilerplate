# Caching

## Two-tier design

`CacheModule` (`core/cache/`) stacks two `cache-manager` stores behind one
interface:

1. **L1 — in-memory** (`CacheableMemory`, LRU, size-bounded by
   `CACHE_LRU_SIZE`) — fastest, but per-process (not shared across
   replicas, lost on restart).
2. **L2 — Redis** (via `@keyv/redis`, on its own DB index, `CACHE_DB`) —
   shared across all app instances.

Reads check L1 first, then fall through to L2. Both share the same
default TTL (`CACHE_TTL`, seconds → converted to ms).

## `CacheService`

Everything goes through `core/cache/cache.service.ts` rather than the raw
`cache-manager` API directly, for one reason: **centralized, prefixed,
parameterized keys.**

```ts
constructor(private readonly cache: CacheService) {}

await this.cache.get<Todo[]>({ key: "todoList" });
await this.cache.set({ key: "todoDetail", args: [id] }, todo);
await this.cache.del({ key: "todoDetail", args: [id] });
await this.cache.wrap({ key: "todoList" }, () => this.repo.find());
await this.cache.getTtl({ key: "todoDetail", args: [id] });
```

Keys are declared once in `core/cache/constants.ts`:

```ts
export const CacheKey = {
  todoList: "todo:list",
  todoDetail: "todo:%s", // %s: todo id, filled via util.format + args
};
```

and prefixed with `app.prefix` at read/write time
(`{prefix}:{resolved key}`), so cache keys never collide across apps
sharing one Redis instance.

**Adding a new cache key:** add an entry to `CacheKey`, use `%s`
placeholders for any `args`, and reference it by its object key (not the
raw string) everywhere you call `CacheService`.

## Cache-invalidation pattern

`TodoService` is the reference for how to do this correctly:

- **List caching**: an empty list is a legitimate value to cache — there's
  no "sticky negative result" risk, so `findAll()` uses `wrap()` directly.
- **Detail caching with a 404**: `findOne()` deliberately does **not**
  cache a not-found result. `cache-manager`'s `wrap`/`set` would store a
  `null` and treat it as a normal cache hit — so a 404 looked up once
  would keep 404ing for the rest of `CACHE_TTL`, even after the record is
  created. Look up manually, cache only the success case.
- **Writes invalidate, they don't update-in-place**: `create()`,
  `update()`, and `remove()` all `del()` the relevant keys (`todoList`
  always; `todoDetail` for that specific id on update/remove) rather than
  trying to patch the cached value — simpler to reason about, and correct
  by construction.

Follow this same shape for any new cached resource: cache successes, not
absence; invalidate specific keys on write, don't try to keep a cache
in sync incrementally.

## HTTP response caching (`@SkipCache()`)

Separately from `CacheService`, `HttpCacheInterceptor` is registered
globally (`APP_INTERCEPTOR`) and caches raw HTTP responses for GET
requests, keyed by full URL — this is `@nestjs/cache-manager`'s stock
`CacheInterceptor` behavior, extended with one thing: routes or whole
controllers marked `@SkipCache()` are never touched by it.

**When to use `@SkipCache()`:**

- Anything that must reflect live state every request — health checks are
  marked this way for exactly that reason (a stale cached `"ok"` defeats a
  liveness/readiness probe).
- Any resource whose caching you're already handling explicitly via
  `CacheService` with real, event-driven invalidation — `TodoController`
  is skip-cached at the controller level because `TodoService` already
  does correct cache management itself, and you don't want two
  independent, uncoordinated caching layers (the interceptor's opaque
  per-URL cache has no way to know when `TodoService` invalidates
  something).

**Rule of thumb:** if a resource has writes that need to invalidate reads,
handle caching explicitly with `CacheService` and `@SkipCache()` the
controller. If a resource is read-only or invalidation timing genuinely
doesn't matter, the interceptor's automatic per-URL caching is fine as-is.

## Redis connection

The cache's Redis connection is created inline inside `CacheModule` (via
`createKeyv`), separate from the rate limiter's Redis connection
(`core/ratelimiter/`) — different `RedisModule` instances, different DB
indices (`CACHE_DB` vs `RATE_LIMIT_DB`), so a Redis-side outage or
maintenance affecting one doesn't necessarily affect the other's client
connection lifecycle.
