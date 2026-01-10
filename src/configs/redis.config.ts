import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { REDIS_CONFIG_TOKEN } from "~/common/constants/config";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

export class RedisConfig {
  @Expose({ name: "REDIS_URL" })
  @IsString()
  @IsOptional()
  url?: string;

  @Expose({ name: "REDIS_HOST" })
  @IsString()
  @IsOptional()
  host = "localhost";

  @Expose({ name: "REDIS_PORT" })
  @IsNumber()
  @IsOptional()
  port: number = 6379;

  @Expose({ name: "REDIS_PASSWORD" })
  @IsString()
  @IsOptional()
  password?: string;

  @Expose({ name: "REDIS_ENABLE_TLS" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  enableTLS: boolean = false;

  @Expose({ name: "REDIS_REJECT_UNAUTHORIZED" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  rejectUnauthorized: boolean = false;

  @Expose({ name: "REDIS_CA" })
  @IsString()
  @IsOptional()
  ca?: string;

  @Expose({ name: "REDIS_KEY" })
  @IsString()
  @IsOptional()
  key?: string;

  @Expose({ name: "REDIS_CERT" })
  @IsString()
  @IsOptional()
  cert?: string;

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
