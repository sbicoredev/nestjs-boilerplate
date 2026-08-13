import { describe, expect, it } from "vitest";

import { toKebabCase } from "./string-helper";

describe("toKebabCase", () => {
  it("converts camelCase to kebab-case", () => {
    expect(toKebabCase("myVariableName")).toBe("my-variable-name");
  });

  it("converts PascalCase to kebab-case", () => {
    expect(toKebabCase("MyVariableName")).toBe("my-variable-name");
  });

  it("converts snake_case to kebab-case", () => {
    expect(toKebabCase("my_variable_name")).toBe("my-variable-name");
  });

  it("converts space separated strings to kebab-case", () => {
    expect(toKebabCase("My Variable Name")).toBe("my-variable-name");
  });

  it("converts NestJS App (the AppConfig default name) to a valid prefix", () => {
    expect(toKebabCase("NestJS App")).toBe("nest-js-app");
  });

  it("leaves an already kebab-cased string unchanged", () => {
    expect(toKebabCase("already-kebab-case")).toBe("already-kebab-case");
  });

  it("collapses multiple consecutive spaces/underscores into one hyphen", () => {
    expect(toKebabCase("my   variable__name")).toBe("my-variable-name");
  });

  it("strips leading and trailing hyphens produced by the conversion", () => {
    expect(toKebabCase(" MyName ")).toBe("my-name");
  });

  it("returns an empty string when given an empty string", () => {
    expect(toKebabCase("")).toBe("");
  });

  it("lowercases a string that has no separators at all", () => {
    expect(toKebabCase("SIMPLE")).toBe("simple");
  });
});
