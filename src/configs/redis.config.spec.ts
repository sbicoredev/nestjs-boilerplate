import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { validatedConfig } from "~/common/utils/validate-config";

import { RedisConfig } from "./redis.config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;

describe("RedisConfig", () => {
  const baseEnv = { REDIS_URL: "redis://localhost:6379" };

  it("applies the documented default connect timeout", () => {
    const config = validatedConfig(baseEnv, RedisConfig);
    expect(config.connectTimeout).toBe(10);
  });

  it("has no default for REDIS_URL, so it's genuinely required", () => {
    expect(() => validatedConfig({}, RedisConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("accepts a custom REDIS_CONNECT_TIMEOUT within range", () => {
    const config = validatedConfig(
      { ...baseEnv, REDIS_CONNECT_TIMEOUT: "30" },
      RedisConfig
    );
    expect(config.connectTimeout).toBe(30);
  });

  it("rejects REDIS_CONNECT_TIMEOUT above the allowed maximum", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, REDIS_CONNECT_TIMEOUT: "500" }, RedisConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("rejects REDIS_CONNECT_TIMEOUT below the allowed minimum", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, REDIS_CONNECT_TIMEOUT: "0" }, RedisConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("rejects an empty REDIS_URL", () => {
    expect(() => validatedConfig({ REDIS_URL: "" }, RedisConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });
});
