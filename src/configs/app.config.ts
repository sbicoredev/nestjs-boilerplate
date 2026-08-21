import { registerAs } from "@nestjs/config";
import { Expose, Transform, type TransformFnParams } from "class-transformer";
import {
  IsArray,
  IsBoolean,
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
import {
  ENV_MAP,
  LOG_LEVEL_MAP,
  LOG_SERVICE_MAP,
} from "~/common/constants/mappings";
import { CORS_HEADERS, CORS_METHODS } from "~/common/constants/security";
import { AsBoolean } from "~/common/decorators/as-boolean.decorator";
import { IsCorsOrigin } from "~/common/decorators/is-cors-origin.decorator";
import { toKebabCase } from "~/common/utils/string-helper";
import { validatedConfig } from "~/common/utils/validate-config";

const REGEX_PREFIX = /^\//;
const REGEX_DIGIT = /^\d+$/;

export class AppConfig {
  @Expose({ name: "NODE_ENV" })
  @IsString()
  @IsIn(Object.values(ENV_MAP))
  environment: keyof typeof ENV_MAP = "development";

  @Expose({ name: "APP_NAME" })
  @IsString()
  @IsNotEmpty()
  name = "NestJS App";

  @Expose({ name: "APP_PREFIX" })
  @IsString()
  @IsOptional()
  prefix: string | undefined;

  @Expose({ name: "APP_DEBUG" })
  @IsBoolean()
  @AsBoolean()
  debug: boolean = false;

  @Expose({ name: "APP_LOG_LEVEL" })
  @IsString()
  @IsIn(Object.values(LOG_LEVEL_MAP))
  logLevel: keyof typeof LOG_LEVEL_MAP = "info";

  @Expose({ name: "APP_LOG_SERVICE" })
  @IsString()
  @IsIn(Object.values(LOG_SERVICE_MAP))
  logService: keyof typeof LOG_SERVICE_MAP = "console";

  @Expose({ name: "APP_VERSION" })
  @IsString()
  @IsNotEmpty()
  version = "0.0.1";

  @Expose({ name: "APP_FALLBACK_LANGUAGE" })
  @IsString()
  @IsNotEmpty()
  fallbackLanguage = "en";

  @Expose({ name: "APP_PORT" })
  @Max(65_535)
  @Min(1)
  @IsNumber()
  port: number = 3000;

  @Expose({ name: "APP_ROUTE_PREFIX" })
  @Matches(REGEX_PREFIX, { message: "APP_ROUTE_PREFIX must start with '/'" })
  @IsString()
  globalPrefix = "/api";

  @Expose({ name: "APP_TRUST_PROXY" })
  @Transform(({ value }: TransformFnParams) => resolveTrustProxy(value))
  trustProxy: boolean | number | string | string[] = false;

  @Expose({ name: "APP_CORS_ORIGINS" })
  @Transform(({ value }: TransformFnParams) => resolveCorsOrigin(value))
  @IsCorsOrigin()
  corsOrigins: boolean | string[] | string = false;

  @Expose({ name: "APP_CORS_ALLOWED_METHODS" })
  @IsString({ each: true })
  @IsArray()
  @Transform(({ value }: TransformFnParams) => resolveCorsMethods(value))
  corsAllowedMethods: string[] = CORS_METHODS;

  @IsString({ each: true })
  @IsArray()
  corsAllowedHeaders: string[] = CORS_HEADERS;
}

export const appConfig = registerAs<AppConfig>(APP_CONFIG_TOKEN, () => {
  const validated = validatedConfig(process.env, AppConfig);
  if (!validated.prefix) {
    validated.prefix = toKebabCase(validated.name);
  }
  return validated;
});

/**
 * Resolves and normalizes CORS origin string into the appropriate format.
 * Handles special values (true/false/*) and comma-separated lists.
 * Automatically adds localhost/127.0.0.1 and www variants.
 */
function resolveCorsOrigin(value: string): boolean | string | string[] {
  if (typeof value !== "string") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "*") {
    return "*";
  }
  if (!value || value === "false") {
    return false;
  }
  const origins = value.split(",").map((o) => o.trim());
  // Add localhost/127.0.0.1 equivalents
  const localhost = origins
    .map((o) =>
      o?.startsWith("http://localhost")
        ? o?.replace("http://localhost", "http://127.0.0.1")
        : o
    )
    .filter((o, index) => o !== origins[index]);
  origins.push(...localhost);
  // Add www variants
  const wwwOrigins = origins
    .map((o) =>
      o?.startsWith("https://") ? o?.replace("https://", "https://www.") : o
    )
    .filter((o, index) => o !== origins[index]);
  origins.push(...wwwOrigins);
  return origins;
}

function resolveCorsMethods(value: string): string[] {
  if (typeof value !== "string") {
    return [];
  }
  if (value === "true") {
    return CORS_METHODS;
  }
  if (value === "*") {
    return CORS_METHODS;
  }
  if (!value || value === "false") {
    return [];
  }
  const methods = value.split(",").map((o) => o.trim());
  return methods.filter((m) => CORS_METHODS.includes(m));
}

/**
 * Resolves and normalizes trust proxy setting.
 * Supports boolean, number, string (IP/CIDR/special), or array of strings.
 */
function resolveTrustProxy(
  value: string
): boolean | number | string | string[] {
  if (typeof value !== "string") {
    return value;
  }
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
