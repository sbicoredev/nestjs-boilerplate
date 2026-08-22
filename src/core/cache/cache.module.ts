import { createKeyv, Keyv } from "@keyv/redis";
import { CacheModule as NestCacheModule } from "@nestjs/cache-manager";
import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { CacheableMemory } from "cacheable";

import type { Configurations } from "~/common/types";
import { cacheConfig } from "~/configs/cache.config";
import { redisConfig } from "~/configs/redis.config";

import { CacheService } from "./cache.service";
import { HttpCacheInterceptor } from "./http-cache.interceptor";

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
        cacheConfigs: Configurations["cache"],
        redisConfigs: Configurations["redis"]
      ) => ({
        ttl: cacheConfigs.ttl * 1000, // Convert seconds to milliseconds
        stores: [
          new Keyv({
            store: new CacheableMemory({
              ttl: cacheConfigs.ttl * 1000, // Convert seconds to milliseconds
              lruSize: cacheConfigs.lruSize,
            }),
          }),
          createKeyv(`${redisConfigs.url}/${cacheConfigs.cacheDB}`, {
            throwOnConnectError: true,
            throwOnErrors: true,
            connectionTimeout: redisConfigs.connectTimeout * 1000,
          }),
        ],
      }),
    }),
  ],
  providers: [
    CacheService,
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor },
  ],
  exports: [CacheService],
})
export class CacheModule {}
