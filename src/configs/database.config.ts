import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { DB_CONFIG_TOKEN } from "~/common/constants/config";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

export class DatabaseConfig {
  @Expose({ name: "DB_URL" })
  @IsString()
  @IsOptional()
  url: string;

  @Expose({ name: "DB_TYPE" })
  @IsString()
  @IsEnum(["postgres", "mysql", "sqlite", "better-sqlite3"])
  @IsOptional()
  type: "postgres" | "mysql" | "sqlite" | "better-sqlite3" = "postgres";

  @Expose({ name: "DB_HOST" })
  @IsString()
  @IsOptional()
  host = "localhost";

  @Expose({ name: "DB_PORT" })
  @Min(1)
  @Max(65_535)
  @IsNumber()
  @IsOptional()
  port: number = 5432;

  @Expose({ name: "DB_NAME" })
  @IsString()
  @IsNotEmpty()
  database: string;

  @Expose({ name: "DB_USER" })
  @IsString()
  @IsNotEmpty()
  user: string;

  @Expose({ name: "DB_PASSWORD" })
  @IsString()
  @IsNotEmpty()
  password: string;

  @Expose({ name: "DB_SYNC" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  sync: boolean = false;

  @Expose({ name: "DB_MAX_CONNECTIONS" })
  @Min(1)
  @Max(1000)
  @IsNumber()
  @IsOptional()
  maxConnections: number = 5432;

  @Expose({ name: "DB_ENABLE_SSL" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  enableSsl: boolean = false;

  @Expose({ name: "DB_SSL_REJECT_UNAUTHORIZED" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  rejectUnauthorized: boolean = false;

  @Expose({ name: "DB_CA" })
  @IsString()
  @IsOptional()
  ca: string;

  @Expose({ name: "DB_KEY" })
  @IsString()
  @IsOptional()
  key: string;

  @Expose({ name: "DB_CERT" })
  @IsString()
  @IsOptional()
  cert: string;
}

export const databaseConfig = registerAs<DatabaseConfig>(DB_CONFIG_TOKEN, () =>
  validatedConfig(process.env, DatabaseConfig)
);
