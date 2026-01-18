import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorFunction,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { InjectRedis, RedisHealthIndicator } from "@nestjs-redis/kit";
import type { RedisClientType } from "redis";

import { REDIS_RATELIMITER_CONN } from "~/common/constants/redis";

@ApiTags("Health")
@Controller()
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
  readyz() {
    return { status: "ok" };
  }

  @Get("livez")
  livez() {
    return { status: "ok" };
  }
}
