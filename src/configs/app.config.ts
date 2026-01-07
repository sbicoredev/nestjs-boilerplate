import { registerAs } from "@nestjs/config";
import { Expose, Transform, TransformFnParams } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from "class-validator";

import { APP_CONFIG_TOKEN } from "~/common/constants/config";
import { IsCorsOrigin } from "~/common/decorators/is-cors-origin.decorator";
import { validatedConfig } from "~/common/utils/validate-config";

const REGEX_PREFIX = /^\//;
const REGEX_DIGIT = /^\d+$/;

export const appEnv = {
  development: "development",
  staging: "staging",
  production: "production",
  test: "test",
} as const;

export class AppConfig {
  @Expose({ name: "NODE_ENV" })
  @IsString()
  @IsIn(Object.values(appEnv))
  @IsOptional()
  environment: keyof typeof appEnv = "development";

  @Expose({ name: "APP_NAME" })
  @IsString()
  @IsNotEmpty()
  name = "";

  @Expose({ name: "APP_PORT" })
  @Max(10_000)
  @Min(1)
  @IsNumber()
  port: number = 3000;

  @Expose({ name: "APP_ROUTE_PREFIX" })
  @Matches(REGEX_PREFIX, { message: "APP_ROUTE_PREFIX must start with '/'" })
  @IsString()
  @IsOptional()
  globalPrefix = "/api";

  @Expose({ name: "APP_TRUST_PROXY" })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === "string"
      ? resolveTrustProxy(value)
      : (value as boolean | number | string | string[])
  )
  trustProxy: boolean | number | string | string[] = false;

  @Expose({ name: "APP_CORS_ORIGINS" })
  @IsOptional()
  @Transform(({ value }: TransformFnParams) =>
    typeof value === "string"
      ? resolveCorsOrigin(value)
      : (value as boolean | string[] | string)
  )
  @IsCorsOrigin()
  corsOrigins: boolean | string[] | string = false;
}

export default registerAs<AppConfig>(APP_CONFIG_TOKEN, () =>
  validatedConfig(process.env, AppConfig)
);

/**
 * Resolves and normalizes CORS origin string into the appropriate format.
 * Handles special values (true/false/*) and comma-separated lists.
 * Automatically adds localhost/127.0.0.1 and www variants.
 */
function resolveCorsOrigin(origin: string): boolean | string | string[] {
  if (origin === "true") {
    return true;
  }
  if (origin === "*") {
    return "*";
  }
  if (!origin || origin === "false") {
    return false;
  }

  const origins = origin.split(",").map((origin) => origin.trim());

  // Add localhost/127.0.0.1 equivalents
  const localhost = origins
    .map((origin) =>
      origin?.startsWith("http://localhost")
        ? origin?.replace("http://localhost", "http://127.0.0.1")
        : origin
    )
    .filter((origin, index) => origin !== origins[index]);
  origins.push(...localhost);

  // Add www variants
  const wwwOrigins = origins
    .map((origin) =>
      origin?.startsWith("https://")
        ? origin?.replace("https://", "https://www.")
        : origin
    )
    .filter((origin, index) => origin !== origins[index]);
  origins.push(...wwwOrigins);

  return origins;
}

/**
 * Resolves and normalizes trust proxy setting.
 * Supports boolean, number, string (IP/CIDR/special), or array of strings.
 */
function resolveTrustProxy(
  value: string
): boolean | number | string | string[] {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }

  if (REGEX_DIGIT.test(value)) {
    return Number.parseInt(value, 10);
  }

  if (value.includes(",")) {
    return value.split(",").map((v) => v.trim());
  }

  return value;
}
