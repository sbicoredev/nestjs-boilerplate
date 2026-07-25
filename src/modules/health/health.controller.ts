import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { InjectRedis } from "@nestjs-redis/client";
import { RedisHealthIndicator } from "@nestjs-redis/health-indicator";
import type { RedisClientType } from "redis";

import { REDIS_RATELIMITER_CONN } from "~/common/constants/redis";
import { SkipCache } from "~/common/decorators/skip-cache.decorator";

@ApiTags("Health")
@Controller()
@SkipCache()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    @InjectRedis(REDIS_RATELIMITER_CONN)
    private readonly redisRatelimit: RedisClientType
  ) {}

  @Get("health")
  @HealthCheck()
  checkHealth() {
    const checkList: HealthIndicatorFunction[] = [
      () => this.memory.checkHeap("memory_heap", 150 * 1024 * 1024),
      () => this.db.pingCheck("database", { timeout: 5000 }),
      () =>
        this.redis.isHealthy("redis-ratelimit", {
          client: this.redisRatelimit,
        }),
    ];
    return this.health.check(checkList);
  }

  @Get("readyz")
  @HealthCheck()
  readyz() {
    // Deliberately lighter than /health: only checks the one dependency that
    // actually determines whether this instance can serve traffic (the
    // database). Memory/Redis-ratelimit are omitted here on purpose — a
    // rate-limiter Redis blip shouldn't pull an otherwise-healthy pod out of
    // rotation the way a real DB outage should.
    return this.health.check([
      () => this.db.pingCheck("database", { timeout: 5000 }),
    ]);
  }

  @Get("livez")
  livez() {
    // Deliberately static: liveness should only answer "is the process
    // alive," not "are dependencies reachable" — a downed dependency should
    // trigger readiness failure (taking the pod out of rotation), not a
    // liveness failure (which would restart the pod and likely not help).
    return { status: "ok" };
  }
}
