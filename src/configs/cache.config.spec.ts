import "reflect-metadata";

import { describe, expect, it } from "vitest";

import { validatedConfig } from "~/common/utils/validate-config";

import { CacheConfig } from "./cache.config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;

describe("CacheConfig", () => {
  it("applies all documented defaults when nothing is set (every field has a class default)", () => {
    const config = validatedConfig({}, CacheConfig);

    expect(config.ttl).toBe(10);
    expect(config.lruSize).toBe(5000);
    expect(config.cacheDB).toBe(0);
  });

  it("accepts a custom CACHE_TTL within range", () => {
    const config = validatedConfig({ CACHE_TTL: "3600" }, CacheConfig);
    expect(config.ttl).toBe(3600);
  });

  it("rejects CACHE_TTL above the allowed maximum (604800 seconds / 7 days)", () => {
    expect(() =>
      validatedConfig({ CACHE_TTL: "1000000" }, CacheConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("rejects CACHE_TTL below the allowed minimum", () => {
    expect(() => validatedConfig({ CACHE_TTL: "0" }, CacheConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("rejects a CACHE_LRU_SIZE below the allowed minimum", () => {
    expect(() => validatedConfig({ CACHE_LRU_SIZE: "0" }, CacheConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("rejects a CACHE_DB outside the allowed 0-100 range", () => {
    expect(() => validatedConfig({ CACHE_DB: "101" }, CacheConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("accepts a CACHE_DB at the upper bound (100)", () => {
    const config = validatedConfig({ CACHE_DB: "100" }, CacheConfig);
    expect(config.cacheDB).toBe(100);
  });
});
