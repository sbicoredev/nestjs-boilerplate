// class-transformer's @Type() decorator reads Reflect metadata; NestJS normally
// has this polyfilled globally via its own bootstrap, but standalone unit
// tests need it imported explicitly.
import "reflect-metadata";

import { plainToInstance } from "class-transformer";

import { AsBoolean } from "./as-boolean.decorator";

class SampleDto {
  @AsBoolean()
  flag: boolean;
}

function transform(value: unknown): boolean | undefined {
  const instance = plainToInstance(SampleDto, { flag: value });
  return instance.flag;
}

describe("AsBoolean", () => {
  it('transforms the string "true" to boolean true', () => {
    expect(transform("true")).toBe(true);
  });

  it('transforms the string "TRUE" (mixed case) to boolean true', () => {
    expect(transform("TRUE")).toBe(true);
  });

  it('transforms the string "false" to boolean false', () => {
    expect(transform("false")).toBe(false);
  });

  it("transforms any other non-matching string to false", () => {
    expect(transform("yes")).toBe(false);
    expect(transform("1")).toBe(false);
  });

  it("coerces an actual boolean true to true (the paired @Type(() => String) stringifies it first)", () => {
    expect(transform(true)).toBe(true);
  });

  it("coerces an actual boolean false to false", () => {
    expect(transform(false)).toBe(false);
  });

  it("coerces a non-boolean, non-string value (e.g. a number) to false", () => {
    expect(transform(1)).toBe(false);
  });

  it("returns undefined for null", () => {
    expect(transform(null)).toBeUndefined();
  });

  it("returns undefined when the property is missing or explicitly undefined", () => {
    expect(transform(undefined)).toBeUndefined();
  });
});
