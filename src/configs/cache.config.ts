import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import { IsNumber, IsOptional, Min } from "class-validator";

import { validatedConfig } from "~/common/utils/validate-config";

export class CacheConfig {
  @Expose({ name: "CACHE_TTL" })
  @Min(1000)
  @IsNumber()
  @IsOptional()
  ttl: number = 60_000;

  @Expose({ name: "CACHE_LRU_SIZE" })
  @Min(1)
  @IsNumber()
  @IsOptional()
  lruSize: number = 5000;
}

export const cacheConfig = registerAs<CacheConfig>("cache", () =>
  validatedConfig(process.env, CacheConfig)
);
