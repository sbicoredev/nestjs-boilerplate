import { SetMetadata } from "@nestjs/common";

export const SKIP_CACHE_METADATA = "skip_cache";

/**
 * Marks a controller or individual route handler as never cacheable by the
 * global CacheInterceptor (see core/cache/http-cache.interceptor.ts).
 *
 * Use this for:
 *  - Anything meant to reflect live state on every request (health checks —
 *    a stale cached "ok" defeats the purpose of a liveness/readiness probe).
 *  - Any resource whose GET responses need to stay correct after a write,
 *    where caching is instead handled explicitly at the service layer
 *    (with real invalidation) rather than by the interceptor's opaque,
 *    un-invalidatable per-URL cache — see TodoService for the pattern.
 */
export const SkipCache = () => SetMetadata(SKIP_CACHE_METADATA, true);
