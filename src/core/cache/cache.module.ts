import { createKeyv, Keyv } from "@keyv/redis";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { Global, Module } from "@nestjs/common";
import { CacheableMemory } from "cacheable";

import { Configurations } from "~/common/types";
import { cacheConfig } from "~/configs/cache.config";
import { redisConfig } from "~/configs/redis.config";

import { CacheService } from "./cache.service";

/**
 * Module that provides a two-level caching system.
 *
 * Level 1 - In-Memory Cache (CacheableMemory)
 * Level 2 - Redis Cache
 */
@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      isGlobal: true,
      inject: [cacheConfig.KEY, redisConfig.KEY],
      useFactory: (
        cfg: Configurations["cache"],
        redisCfg: Configurations["redis"]
      ) => ({
        ttl: cfg.ttl * 1000, // Convert seconds to milliseconds
        stores: [
          new Keyv({
            store: new CacheableMemory({
              ttl: cfg.ttl * 1000, // Convert seconds to milliseconds
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
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
