import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GracefulShutdownModule } from "@tygra/nestjs-graceful-shutdown";

import { appConfig } from "~/configs/app.config.js";
import { cacheConfig } from "~/configs/cache.config.js";
import { databaseConfig } from "~/configs/database.config.js";
import { emailConfig } from "~/configs/email.config.js";
import { ratelimiterConfig } from "~/configs/ratelimiter.config.js";
import { redisConfig } from "~/configs/redis.config.js";

import { CacheModule } from "./cache/cache.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { EmailModule } from "./email/email.module.js";
import { HttpContextModule } from "./http-context/http-context.module.js";
import { InternationalizationModule } from "./internationalization/internationalization.module.js";
import { ObservabilityModule } from "./observability/observability.module.js";
import { RatelimiterModule } from "./ratelimiter/ratelimiter.module.js";

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
        emailConfig,
      ],
      envFilePath: process.env.NODE_ENV === "test" ? ".env.test.local" : ".env",
      expandVariables: true,
      skipProcessEnv: true,
      cache: true,
      isGlobal: true,
    }),
    InternationalizationModule,
    DatabaseModule,
    CacheModule,
    RatelimiterModule,
    HttpContextModule.forRoot(),
    // ObservabilityModule should be placed below the HttpContext module for the req id generation
    ObservabilityModule,
    EmailModule,
  ],
})
export class CoreModule {}
