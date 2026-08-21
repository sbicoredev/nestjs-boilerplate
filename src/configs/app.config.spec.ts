import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { validatedConfig } from "~/common/utils/validate-config";

import { AppConfig, appConfig } from "./app.config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;

/**
 * appConfig() reads directly from process.env (that's what registerAs()
 * wraps for real DI use), so these tests snapshot and restore it rather than
 * passing a plain object like the AppConfig-class tests below do.
 */
function withEnv<T>(env: Record<string, string>, fn: () => T): T {
  const original = { ...process.env };
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("APP_") || key === "NODE_ENV") {
      delete process.env[key];
    }
  }
  Object.assign(process.env, env);
  try {
    return fn();
  } finally {
    process.env = original;
  }
}

/** appConfig() is declared as a general ConfigFactory (sync | Promise), but this
 * particular factory is always synchronous. */
function callAppConfig(): AppConfig {
  return appConfig() as AppConfig;
}

describe("AppConfig", () => {
  const baseEnv = { APP_NAME: "Test App" };

  it("applies documented defaults when only the required field is set", () => {
    const config = validatedConfig(baseEnv, AppConfig);

    expect(config.environment).toBe("development");
    expect(config.debug).toBe(false);
    expect(config.logLevel).toBe("info");
    expect(config.logService).toBe("console");
    expect(config.fallbackLanguage).toBe("en");
    expect(config.port).toBe(3000);
    expect(config.globalPrefix).toBe("/api");
    expect(config.corsOrigins).toBe(false);
    expect(config.trustProxy).toBe(false);
  });

  it("falls back to the default APP_NAME when it isn't set at all (defaults apply before validation)", () => {
    const config = validatedConfig({}, AppConfig);
    expect(config.name).toBe("NestJS App");
  });

  it("rejects an explicitly empty APP_NAME (an explicit value overrides the default, so @IsNotEmpty fires)", () => {
    expect(() => validatedConfig({ APP_NAME: "" }, AppConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("only accepts a known NODE_ENV value", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, NODE_ENV: "sandbox" }, AppConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("accepts a valid NODE_ENV value", () => {
    const config = validatedConfig(
      { ...baseEnv, NODE_ENV: "production" },
      AppConfig
    );
    expect(config.environment).toBe("production");
  });

  it("rejects a port outside the allowed range", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, APP_PORT: "70000" }, AppConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("requires APP_ROUTE_PREFIX to start with a slash", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, APP_ROUTE_PREFIX: "api" }, AppConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("converts APP_DEBUG string values into a real boolean", () => {
    const config = validatedConfig(
      { ...baseEnv, APP_DEBUG: "true" },
      AppConfig
    );
    expect(config.debug).toBe(true);
  });

  describe("prefix derivation (via the appConfig registerAs factory)", () => {
    it("derives `prefix` by kebab-casing `name` when APP_PREFIX is not set", () => {
      const config = withEnv({ APP_NAME: "My Cool App" }, () =>
        callAppConfig()
      );
      expect(config.prefix).toBe("my-cool-app");
    });

    it("uses APP_PREFIX directly when it is explicitly set", () => {
      const config = withEnv({ ...baseEnv, APP_PREFIX: "custom-prefix" }, () =>
        callAppConfig()
      );
      expect(config.prefix).toBe("custom-prefix");
    });
  });

  describe("CORS origin resolution", () => {
    it('treats APP_CORS_ORIGINS="true" as boolean true', () => {
      const config = validatedConfig(
        { ...baseEnv, APP_CORS_ORIGINS: "true" },
        AppConfig
      );
      expect(config.corsOrigins).toBe(true);
    });

    it('treats APP_CORS_ORIGINS="false" as boolean false', () => {
      const config = validatedConfig(
        { ...baseEnv, APP_CORS_ORIGINS: "false" },
        AppConfig
      );
      expect(config.corsOrigins).toBe(false);
    });

    it('treats APP_CORS_ORIGINS="*" as the literal wildcard string', () => {
      const config = validatedConfig(
        { ...baseEnv, APP_CORS_ORIGINS: "*" },
        AppConfig
      );
      expect(config.corsOrigins).toBe("*");
    });

    it("expands a single https origin with its www variant", () => {
      const config = validatedConfig(
        { ...baseEnv, APP_CORS_ORIGINS: "https://example.com" },
        AppConfig
      );
      expect(config.corsOrigins).toEqual(
        expect.arrayContaining([
          "https://example.com",
          "https://www.example.com",
        ])
      );
    });

    it("expands a localhost origin with its 127.0.0.1 variant", () => {
      const config = validatedConfig(
        { ...baseEnv, APP_CORS_ORIGINS: "http://localhost:3000" },
        AppConfig
      );
      expect(config.corsOrigins).toEqual(
        expect.arrayContaining([
          "http://localhost:3000",
          "http://127.0.0.1:3000",
        ])
      );
    });

    it("splits a comma-separated origin list", () => {
      const config = validatedConfig(
        {
          ...baseEnv,
          APP_CORS_ORIGINS: "https://a.example.com,https://b.example.com",
        },
        AppConfig
      );
      expect(config.corsOrigins).toEqual(
        expect.arrayContaining([
          "https://a.example.com",
          "https://b.example.com",
        ])
      );
    });
  });

  describe("trust proxy resolution", () => {
    it('parses APP_TRUST_PROXY="true" as boolean true', () => {
      const config = validatedConfig(
        { ...baseEnv, APP_TRUST_PROXY: "true" },
        AppConfig
      );
      expect(config.trustProxy).toBe(true);
    });

    it("parses a numeric-looking APP_TRUST_PROXY as a number", () => {
      const config = validatedConfig(
        { ...baseEnv, APP_TRUST_PROXY: "2" },
        AppConfig
      );
      expect(config.trustProxy).toBe(2);
    });

    it("splits a comma-separated APP_TRUST_PROXY into an array", () => {
      const config = validatedConfig(
        { ...baseEnv, APP_TRUST_PROXY: "10.0.0.1,10.0.0.2" },
        AppConfig
      );
      expect(config.trustProxy).toEqual(["10.0.0.1", "10.0.0.2"]);
    });

    it("passes through a single non-boolean, non-numeric value unchanged", () => {
      const config = validatedConfig(
        { ...baseEnv, APP_TRUST_PROXY: "loopback" },
        AppConfig
      );
      expect(config.trustProxy).toBe("loopback");
    });
  });
});
