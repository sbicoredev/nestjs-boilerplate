import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { seconds, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { RedisModule, RedisToken } from "@nestjs-redis/client";
import { RedisThrottlerStorage } from "@nestjs-redis/throttler-storage";

import { REDIS_RATELIMITER_CONN } from "~/common/constants/redis";
import type { Configurations } from "~/common/types";
import { ratelimiterConfig } from "~/configs/ratelimiter.config";
import { redisConfig } from "~/configs/redis.config";

@Module({
  imports: [
    RedisModule.forRootAsync({
      connectionName: REDIS_RATELIMITER_CONN,
      isGlobal: true,
      inject: [ratelimiterConfig.KEY, redisConfig.KEY],
      useFactory: (
        ratelimiterConfigs: Configurations["ratelimiter"],
        redisConfigs: Configurations["redis"]
      ) => ({
        options: {
          url: `${redisConfigs.url}/${ratelimiterConfigs.ratelimitDB}`,
        },
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ratelimiterConfig.KEY, RedisToken(REDIS_RATELIMITER_CONN)],
      useFactory: (
        ratelimiterConfigs: Configurations["ratelimiter"],
        redisClient: ConstructorParameters<typeof RedisThrottlerStorage>[0]
      ) => ({
        storage: new RedisThrottlerStorage(redisClient),
        throttlers: [
          {
            skipIf: () => !ratelimiterConfigs.enabled,
            ttl: seconds(ratelimiterConfigs.ttl),
            limit: ratelimiterConfigs.limit,
            blockDuration: seconds(ratelimiterConfigs.blockDuration),
          },
        ],
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class RatelimiterModule {}
