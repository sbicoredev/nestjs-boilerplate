import type { NextFunction, Request, Response } from "express";

import type { AppConfig } from "~/configs/app.config.js";
import type { CacheConfig } from "~/configs/cache.config.js";
import type { DatabaseConfig } from "~/configs/database.config.js";
import type { EmailConfig } from "~/configs/email.config.js";
import type { RatelimiterConfig } from "~/configs/ratelimiter.config.js";
import type { RedisConfig } from "~/configs/redis.config.js";

import {
  APP_CONFIG_TOKEN,
  CACHE_CONFIG_TOKEN,
  DB_CONFIG_TOKEN,
  EMAIL_CONFIG_TOKEN,
  RATELIMITER_CONFIG_TOKEN,
  REDIS_CONFIG_TOKEN,
} from "./constants/config.js";

export type Configurations = {
  [APP_CONFIG_TOKEN]: AppConfig;
  [DB_CONFIG_TOKEN]: DatabaseConfig;
  [REDIS_CONFIG_TOKEN]: RedisConfig;
  [CACHE_CONFIG_TOKEN]: CacheConfig;
  [RATELIMITER_CONFIG_TOKEN]: RatelimiterConfig;
  [EMAIL_CONFIG_TOKEN]: EmailConfig;
};

export type NestRequest = Request & { id: string };
export type NestResponse = Response;
export type NestNextFunction = NextFunction;
