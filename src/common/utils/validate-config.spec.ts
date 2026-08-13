import "reflect-metadata";

import { Expose } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";
import { describe, expect, it } from "vitest";

import { validatedConfig } from "./validate-config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;
const URL_PROPERTY_MENTIONED = /url/;
const CUSTOM_PREFIX_MENTIONED = /Custom prefix/;

class SampleConfig {
  @Expose({ name: "SAMPLE_URL" })
  @IsString()
  @IsNotEmpty()
  url: string;

  @Expose({ name: "SAMPLE_MODE" })
  @IsString()
  @IsIn(["a", "b"])
  @IsOptional()
  mode: "a" | "b" = "a";

  @Expose({ name: "SAMPLE_PORT" })
  @IsNumber()
  @IsOptional()
  port: number = 100;
}

describe("validatedConfig", () => {
  it("returns a validated instance when all required fields are present", () => {
    const result = validatedConfig(
      { SAMPLE_URL: "https://example.com" },
      SampleConfig
    );

    expect(result.url).toBe("https://example.com");
  });

  it("applies class defaults when optional fields are missing", () => {
    const result = validatedConfig(
      { SAMPLE_URL: "https://example.com" },
      SampleConfig
    );

    expect(result.mode).toBe("a");
    expect(result.port).toBe(100);
  });

  it("maps env var names via @Expose to the class property names", () => {
    const result = validatedConfig(
      { SAMPLE_URL: "https://example.com", SAMPLE_MODE: "b" },
      SampleConfig
    );

    expect(result.mode).toBe("b");
  });

  it("coerces numeric-looking string env vars to numbers via implicit conversion", () => {
    const result = validatedConfig(
      { SAMPLE_URL: "https://example.com", SAMPLE_PORT: "8080" },
      SampleConfig
    );

    expect(result.port).toBe(8080);
    expect(typeof result.port).toBe("number");
  });

  it("throws when a required field is missing", () => {
    expect(() => validatedConfig({}, SampleConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("throws when a field fails validation (e.g. not in the allowed set)", () => {
    expect(() =>
      validatedConfig(
        { SAMPLE_URL: "https://example.com", SAMPLE_MODE: "z" },
        SampleConfig
      )
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("includes the offending property name in the thrown error message", () => {
    expect(() => validatedConfig({}, SampleConfig)).toThrow(
      URL_PROPERTY_MENTIONED
    );
  });

  it("uses a custom error prefix when provided", () => {
    expect(() =>
      validatedConfig({}, SampleConfig, { errorPrefix: "Custom prefix" })
    ).toThrow(CUSTOM_PREFIX_MENTIONED);
  });

  it("strips properties not declared on the config class (excludeExtraneousValues)", () => {
    const result = validatedConfig(
      { SAMPLE_URL: "https://example.com", UNRELATED_VAR: "ignored" },
      SampleConfig
    ) as SampleConfig & { UNRELATED_VAR?: string };

    expect(result.UNRELATED_VAR).toBeUndefined();
  });
});
