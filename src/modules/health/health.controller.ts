import v8 from "node:v8";

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
    private readonly healthCheckService: HealthCheckService,
    private readonly memoryHealthIndicator: MemoryHealthIndicator,
    private readonly databaseHealthIndicator: TypeOrmHealthIndicator,
    private readonly redisHealthIndicator: RedisHealthIndicator,
    @InjectRedis(REDIS_RATELIMITER_CONN)
    private readonly redisRatelimitClient: RedisClientType
  ) {}

  @Get("health")
  @HealthCheck()
  async checkHealth() {
    const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;

    const checkList: HealthIndicatorFunction[] = [
      () =>
        this.memoryHealthIndicator.checkHeap(
          "memory_heap",
          heapLimitBytes * 0.7
        ), // 70% of heapLimit
      () =>
        this.memoryHealthIndicator.checkRSS("memory_rss", heapLimitBytes * 0.8), // 80% of heapLimit
      () =>
        this.databaseHealthIndicator.pingCheck("database", { timeout: 5000 }),
      () =>
        this.redisHealthIndicator.isHealthy("redis-ratelimit", {
          client: this.redisRatelimitClient,
        }),
    ];
    const healthCheckResult = await this.healthCheckService.check(checkList);
    return {
      status: healthCheckResult.status,
      checks: healthCheckResult.details || {},
    };
  }

  @Get("readyz")
  @HealthCheck()
  readyz() {
    // Deliberately lighter than /health: only checks the one dependency that
    // actually determines whether this instance can serve traffic (the
    // database). Memory/Redis-ratelimit are omitted here on purpose — a
    // rate-limiter Redis blip shouldn't pull an otherwise-healthy pod out of
    // rotation the way a real DB outage should.
    return this.healthCheckService.check([
      () =>
        this.databaseHealthIndicator.pingCheck("database", { timeout: 5000 }),
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
