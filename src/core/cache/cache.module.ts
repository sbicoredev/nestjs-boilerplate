import { createKeyv, Keyv } from "@keyv/redis";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { Module } from "@nestjs/common";
import { CacheableMemory } from "cacheable";

import { Configurations } from "~/common/types";
import { cacheConfig } from "~/configs/cache.config";
import { redisConfig } from "~/configs/redis.config";

@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [cacheConfig.KEY, redisConfig.KEY],
      useFactory: (
        cfg: Configurations["cache"],
        redisCfg: Configurations["redis"]
      ) => ({
        ttl: cfg.ttl,
        stores: [
          new Keyv({
            store: new CacheableMemory({
              ttl: cfg.ttl,
              lruSize: cfg.lruSize,
            }),
          }),
          createKeyv(redisCfg.url, {
            throwOnConnectError: true,
            throwOnErrors: true,
            connectionTimeout: redisCfg.connectTimeout,
          }),
        ],
      }),
    }),
  ],
})
export class CacheModule {}
