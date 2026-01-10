import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

import { validatedConfig } from "~/common/utils/validate-config";

export class CacheConfig {
  /** In seconds */
  @Expose({ name: "CACHE_TTL" })
  @Max(604_800)
  @Min(1)
  @IsNumber()
  @IsOptional()
  ttl: number = 10;

  @Expose({ name: "CACHE_LRU_SIZE" })
  @Min(1)
  @IsNumber()
  @IsOptional()
  lruSize: number = 5000;
}

export const cacheConfig = registerAs<CacheConfig>("cache", () =>
  validatedConfig(process.env, CacheConfig)
);
