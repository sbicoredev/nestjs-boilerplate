import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { REDIS_CONFIG_TOKEN } from "~/common/constants/config";
import { validatedConfig } from "~/common/utils/validate-config";

export class RedisConfig {
  @Expose({ name: "REDIS_URL" })
  @IsString()
  @IsNotEmpty()
  url: string;

  /** In seconds */
  @Expose({ name: "REDIS_CONNECT_TIMEOUT" })
  @Max(100)
  @Min(1)
  @IsNumber()
  @IsOptional()
  connectTimeout: number = 10;
}

export const redisConfig = registerAs<RedisConfig>(REDIS_CONFIG_TOKEN, () =>
  validatedConfig(process.env, RedisConfig)
);
