import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GracefulShutdownModule } from "@tygra/nestjs-graceful-shutdown";

import { appConfig } from "~/configs/app.config";
import { cacheConfig } from "~/configs/cache.config";
import { databaseConfig } from "~/configs/database.config";
import { ratelimiterConfig } from "~/configs/ratelimiter.config";
import { redisConfig } from "~/configs/redis.config";

import { CacheModule } from "./cache/cache.module";
import { DatabaseModule } from "./database/database.module";
import { LocalizationModule } from "./localization/localization.module";

@Module({
  imports: [
    GracefulShutdownModule.forRoot(),
    ConfigModule.forRoot({
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        cacheConfig,
        ratelimiterConfig,
      ],
      expandVariables: true,
      skipProcessEnv: true,
      cache: true,
      isGlobal: true,
    }),
    LocalizationModule,
    DatabaseModule,
    CacheModule,
  ],
})
export class CoreModule {}
