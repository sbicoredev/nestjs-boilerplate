import "reflect-metadata";

import { validatedConfig } from "~/common/utils/validate-config";

import { RatelimiterConfig } from "./ratelimiter.config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;

describe("RatelimiterConfig", () => {
  it("applies all documented defaults when nothing is set (every field has a class default)", () => {
    const config = validatedConfig({}, RatelimiterConfig);

    expect(config.enabled).toBe(true);
    expect(config.ttl).toBe(60);
    expect(config.limit).toBe(100);
    expect(config.blockDuration).toBe(60);
    expect(config.ratelimitDB).toBe(1);
  });

  it("converts RATE_LIMIT_ENABLED string values into a real boolean", () => {
    const config = validatedConfig(
      { RATE_LIMIT_ENABLED: "false" },
      RatelimiterConfig
    );
    expect(config.enabled).toBe(false);
  });

  it("accepts a custom RATE_LIMIT_MAX", () => {
    const config = validatedConfig({ RATE_LIMIT_MAX: "50" }, RatelimiterConfig);
    expect(config.limit).toBe(50);
  });

  it("rejects RATE_LIMIT_MAX below the allowed minimum", () => {
    expect(() =>
      validatedConfig({ RATE_LIMIT_MAX: "0" }, RatelimiterConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("rejects RATE_LIMIT_TTL below the allowed minimum", () => {
    expect(() =>
      validatedConfig({ RATE_LIMIT_TTL: "0" }, RatelimiterConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("allows RATE_LIMIT_BLOCK_DURATION to be zero (no blocking)", () => {
    const config = validatedConfig(
      { RATE_LIMIT_BLOCK_DURATION: "0" },
      RatelimiterConfig
    );
    expect(config.blockDuration).toBe(0);
  });

  it("rejects a RATE_LIMIT_DB outside the allowed 0-100 range", () => {
    expect(() =>
      validatedConfig({ RATE_LIMIT_DB: "-1" }, RatelimiterConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });
});
