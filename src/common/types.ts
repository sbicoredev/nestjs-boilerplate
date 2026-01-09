import { AppConfig } from "~/configs/app.config";
import { CacheConfig } from "~/configs/cache.config";
import { DatabaseConfig } from "~/configs/database.config";
import { RedisConfig } from "~/configs/redis.config";

import {
  APP_CONFIG_TOKEN,
  CACHE_CONFIG_TOKEN,
  DB_CONFIG_TOKEN,
  REDIS_CONFIG_TOKEN,
} from "./constants/config";

export interface Configurations {
  [APP_CONFIG_TOKEN]: AppConfig;
  [DB_CONFIG_TOKEN]: DatabaseConfig;
  [REDIS_CONFIG_TOKEN]: RedisConfig;
  [CACHE_CONFIG_TOKEN]: CacheConfig;
}
