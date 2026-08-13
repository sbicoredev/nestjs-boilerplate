# ADR 0004: Separate liveness, readiness, and full health endpoints

- **Status**: Accepted
- **Date**: 2026-01-01 (retroactively documented from existing code)

## Context

A single `/health` endpoint checking every dependency (database, cache,
memory) is a common starting point, but conflates two different
questions an orchestrator needs answered differently: "is this process
alive and should keep running" (liveness) vs. "should this instance
currently receive traffic" (readiness). Answering both the same way means
a transient dependency blip (e.g. Redis briefly unreachable) can trigger
a pod **restart** (via a failed liveness probe) when what's actually
needed is to pull it out of load-balancer rotation until the dependency
recovers (readiness) — a restart doesn't fix an external outage and adds
unnecessary churn.

## Decision

Three distinct endpoints (`HealthController`):

- **`/livez`** — static `{ status: "ok" }`, checks nothing. Answers "is
  the process alive" only.
- **`/readyz`** — checks Postgres only (the one dependency that actually
  determines whether this instance can serve traffic correctly).
- **`/health`** — the full diagnostic: Postgres, Redis (rate-limiter
  connection), and memory heap. For dashboards/manual diagnosis, not
  wired to a specific probe type.

## Alternatives considered

- **One `/health` endpoint for everything** — simplest to build. Rejected
  for the reason above: it forces a choice between over-restarting
  (wiring liveness to full dependency health) or under-protecting
  (wiring readiness to nothing), when the actual need is different
  behavior for each.
- **Readiness including Redis too** — considered, since Redis backs both
  caching and rate limiting. Rejected: a rate-limiter Redis blip
  shouldn't pull an otherwise-healthy, database-reachable instance out of
  rotation the way a real database outage should — the comment in
  `HealthController` documents this reasoning directly.

## Consequences

- **Easier**: orchestrator behavior matches actual failure semantics — a
  database outage degrades gracefully (instances marked not-ready, traffic
  routed elsewhere, no restart storm), rather than the whole fleet
  restarting in response to something a restart can't fix.
- **Harder**: three endpoints to keep in mind (and keep correctly scoped)
  instead of one — adding a new dependency check requires deciding which
  of the three (if any) it belongs in, not just adding it to "the" health
  check.

## Revisit when

If a new dependency is added that _should_ gate readiness (e.g. a new
required datastore) — add it to `/readyz`, and think carefully before
adding anything to `/livez`, which is deliberately static.
