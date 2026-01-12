import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, Min } from "class-validator";

import { RATELIMITER_CONFIG_TOKEN } from "~/common/constants/config";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

export class RatelimiterConfig {
  @Expose({ name: "RATE_LIMIT_ENABLED" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  enabled: boolean = true;

  /** In seconds */
  @Expose({ name: "RATE_LIMIT_TTL" })
  @IsNumber()
  @Min(1)
  @IsOptional()
  ttl: number = 60;

  @Expose({ name: "RATE_LIMIT_MAX" })
  @Min(1)
  @IsNumber()
  @IsOptional()
  limit: number = 100;

  /**
   * In seconds
   * Block duration after exceeding the limit
   */
  @Expose({ name: "RATE_LIMIT_BLOCK_DURATION" })
  @Min(0)
  @IsNumber()
  @IsOptional()
  blockDuration: number = 60;
}

export const ratelimiterConfig = registerAs<RatelimiterConfig>(
  RATELIMITER_CONFIG_TOKEN,
  () => validatedConfig(process.env, RatelimiterConfig)
);
