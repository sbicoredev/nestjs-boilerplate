import type { NextFunction, Request, Response } from "express";

import type { AppConfig } from "~/configs/app.config";
import type { CacheConfig } from "~/configs/cache.config";
import type { DatabaseConfig } from "~/configs/database.config";
import type { RatelimiterConfig } from "~/configs/ratelimiter.config";
import type { RedisConfig } from "~/configs/redis.config";

import {
  APP_CONFIG_TOKEN,
  CACHE_CONFIG_TOKEN,
  DB_CONFIG_TOKEN,
  RATELIMITER_CONFIG_TOKEN,
  REDIS_CONFIG_TOKEN,
} from "./constants/config";

declare global {
  interface Configurations {
    [APP_CONFIG_TOKEN]: AppConfig;
    [DB_CONFIG_TOKEN]: DatabaseConfig;
    [REDIS_CONFIG_TOKEN]: RedisConfig;
    [CACHE_CONFIG_TOKEN]: CacheConfig;
    [RATELIMITER_CONFIG_TOKEN]: RatelimiterConfig;
  }

  type NestRequest = Request & { id: string };
  type NestResponse = Response;
  type NestNextFunction = NextFunction;
}
