import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { seconds, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import {
  RedisModule,
  RedisThrottlerStorage,
  RedisToken,
} from "@nestjs-redis/kit";

import { REDIS_RATELIMITER_CONN } from "~/common/constants/redis";
import { ratelimiterConfig } from "~/configs/ratelimiter.config";
import { redisConfig } from "~/configs/redis.config";

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [
        RedisModule.forRootAsync({
          connectionName: REDIS_RATELIMITER_CONN,
          inject: [redisConfig.KEY],
          useFactory: (cfg: Configurations["redis"]) => ({
            options: { url: cfg.url },
          }),
        }),
      ],
      inject: [ratelimiterConfig.KEY, RedisToken(REDIS_RATELIMITER_CONN)],
      useFactory: (cfg: Configurations["ratelimiter"], redis) => {
        return {
          storage: new RedisThrottlerStorage(redis),
          throttlers: [
            {
              skipIf: () => !cfg.enabled,
              ttl: seconds(cfg.ttl),
              limit: cfg.limit,
              blockDuration: seconds(cfg.blockDuration),
            },
          ],
        };
      },
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
