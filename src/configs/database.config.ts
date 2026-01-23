import { registerAs } from "@nestjs/config";
import { Expose } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

import { DB_CONFIG_TOKEN } from "~/common/constants/config";
import { dbMap } from "~/common/constants/mappings";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

export class DatabaseConfig {
  @Expose({ name: "DB_URL" })
  @IsString()
  @IsNotEmpty()
  url: string;

  @Expose({ name: "DB_TYPE" })
  @IsString()
  @IsIn(Object.values(dbMap))
  @IsOptional()
  type: keyof typeof dbMap = "postgres";

  @Expose({ name: "DB_ENABLE_SSL" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  enableSSL: boolean = true;

  /** In seconds */
  @Expose({ name: "DB_CONNECT_TIMEOUT" })
  @Max(100)
  @Min(1)
  @IsNumber()
  @IsOptional()
  connectTimeout: number = 10;

  @Expose({ name: "DB_MAX_CONNECTIONS" })
  @Min(1)
  @Max(1000)
  @IsNumber()
  @IsOptional()
  maxConnections: number = 1000;

  @Expose({ name: "DB_SYNC" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  sync: boolean = false;
}

export const databaseConfig = registerAs<DatabaseConfig>(DB_CONFIG_TOKEN, () =>
  validatedConfig(process.env, DatabaseConfig)
);
