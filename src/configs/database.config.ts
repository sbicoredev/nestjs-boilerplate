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
import { DB_MAP } from "~/common/constants/mappings";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

export class DatabaseConfig {
  @Expose({ name: "DB_URL" })
  @IsString()
  @IsNotEmpty()
  url: string;

  @Expose({ name: "DB_TYPE" })
  @IsString()
  @IsIn(Object.values(DB_MAP))
  @IsOptional()
  type: keyof typeof DB_MAP = "postgres";

  /** In seconds */
  @Expose({ name: "DB_CONNECT_TIMEOUT" })
  @Max(100)
  @Min(1)
  @IsNumber()
  @IsOptional()
  connectTimeout: number = 10;

  @Expose({ name: "DB_MAX_CONNECTIONS" })
  @Min(1)
  @Max(100)
  @IsNumber()
  @IsOptional()
  maxConnections: number = 10;

  @Expose({ name: "DB_SYNC" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  sync: boolean = false;

  // Defaults to true: most managed Postgres providers (RDS, Supabase,
  // Neon, etc.) require TLS on the connection. Set DB_ENABLE_SSL=false
  // explicitly for local/dev databases that don't terminate TLS.
  @Expose({ name: "DB_ENABLE_SSL" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  enableSSL: boolean = true;

  // Only used when enableSSL is true. Defaults to true (verify the
  // server cert). Some managed providers issue certs that don't chain to
  // a public CA the Node trust store recognizes — set this to false for
  // those, rather than disabling SSL entirely.
  @Expose({ name: "DB_SSL_REJECT_UNAUTHORIZED" })
  @IsBoolean()
  @AsBoolean()
  @IsOptional()
  sslRejectUnauthorized: boolean = true;
}

export const databaseConfig = registerAs<DatabaseConfig>(DB_CONFIG_TOKEN, () =>
  validatedConfig(process.env, DatabaseConfig)
);
