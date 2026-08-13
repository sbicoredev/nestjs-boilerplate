# ADR 0002: Two-tier cache (in-memory LRU + Redis)

- **Status**: Accepted
- **Date**: 2026-01-01 (retroactively documented from existing code)

## Context

A cache needs to be fast (favor in-process memory) and shared/consistent
across multiple app replicas (favor a network store like Redis). Neither
alone satisfies both: memory-only caching means every replica has its own
view and cold-starts on deploy; Redis-only caching means every cache hit
still costs a network round trip.

## Decision

`CacheModule` stacks two `cache-manager` stores behind one
`CacheService`: an in-memory LRU (`CacheableMemory`, bounded by
`CACHE_LRU_SIZE`) as L1, Redis (`@keyv/redis`, its own DB index) as L2.
Reads check L1 first, fall through to L2. Both keys and TTLs are managed
uniformly through `CacheService`, with keys centralized in
`core/cache/constants.ts` and prefixed with `app.prefix` to avoid
collisions on a shared Redis instance.

## Alternatives considered

- **Redis only** — simpler, one source of truth, no cross-replica
  staleness window. Rejected: every cache read pays a network round trip
  even for very hot keys, and adds a hard dependency on Redis being
  reachable for cache reads that would otherwise be cheap.
- **In-memory only** — fastest possible reads. Rejected: no sharing
  across replicas (each pod builds its own cache from cold), and cache
  invalidation across replicas is not possible at all (a write on one pod
  can't invalidate another pod's stale in-memory entry).

## Consequences

- **Easier**: hot keys served from memory with no network cost; cache
  still shared/consistent across replicas via the Redis layer beneath it.
- **Harder**: two layers to reason about when debugging a caching bug —
  a stale value could be sitting in L1 on one replica even after L2 is
  correctly invalidated elsewhere, until that replica's local TTL expires.
  Cache invalidation (`CacheService.del()`) only clears the local
  process's own `cache-manager` call chain — it does not proactively
  purge L1 memory on _other_ replicas; those still expire on their own
  TTL, capping the staleness window to the L1 TTL rather than eliminating
  it.

## Revisit when

If a caching bug traces back to L1/L2 staleness divergence across
replicas becoming a real operational problem (not just theoretical) —
at that point, consider a pub/sub-based cross-replica invalidation
signal, or drop to Redis-only for the affected keys.
