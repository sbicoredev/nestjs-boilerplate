import "reflect-metadata";

import { validateSync } from "class-validator";

import { IsCorsOrigin } from "./is-cors-origin.decorator";

class SampleDto {
  @IsCorsOrigin()
  corsOrigins: boolean | string | string[];
}

function isValid(value: unknown): boolean {
  const instance = new SampleDto();
  instance.corsOrigins = value as never;
  return validateSync(instance).length === 0;
}

describe("IsCorsOrigin", () => {
  it("accepts boolean true", () => {
    expect(isValid(true)).toBe(true);
  });

  it("accepts boolean false", () => {
    expect(isValid(false)).toBe(true);
  });

  it('accepts the wildcard "*"', () => {
    expect(isValid("*")).toBe(true);
  });

  it("accepts a single valid https URL", () => {
    expect(isValid("https://example.com")).toBe(true);
  });

  it("accepts a single valid http URL", () => {
    expect(isValid("http://example.com")).toBe(true);
  });

  it("accepts localhost with a port", () => {
    expect(isValid("http://localhost:3000")).toBe(true);
  });

  it("accepts 127.0.0.1 with a port", () => {
    expect(isValid("http://127.0.0.1:3000")).toBe(true);
  });

  it("accepts an array of valid URLs", () => {
    expect(isValid(["https://example.com", "https://app.example.com"])).toBe(
      true
    );
  });

  it("rejects an empty array", () => {
    expect(isValid([])).toBe(false);
  });

  it("rejects an array containing an invalid URL", () => {
    expect(isValid(["https://example.com", "not-a-url"])).toBe(false);
  });

  it("rejects a plain non-URL string", () => {
    expect(isValid("not-a-url")).toBe(false);
  });

  it("rejects a number", () => {
    expect(isValid(42)).toBe(false);
  });

  it("rejects an object", () => {
    expect(isValid({})).toBe(false);
  });
});
