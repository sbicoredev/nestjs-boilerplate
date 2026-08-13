// biome-ignore-all lint/style/noIncrementDecrement: explain
import { describe, expect, test } from "vitest";

import { uuidv7 } from "./uuidv7";

const UUID_V7_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractTimestampFromUuidV7(uuid: string) {
  const hex = uuid.replace(/-/g, "");
  const timestampHex = hex.slice(0, 12);
  return Number.parseInt(timestampHex, 16);
}

describe("uuidv7", () => {
  test("returns a string", () => {
    const id = uuidv7();

    expect(typeof id).toBe("string");
  });

  test("returns a UUID string with length 36", () => {
    const id = uuidv7();

    expect(id).toHaveLength(36);
  });

  test("matches UUIDv7 format", () => {
    const id = uuidv7();

    expect(id).toMatch(UUID_V7_REGEX);
  });

  test("contains version 7", () => {
    const id = uuidv7();
    const parts = id.split("-");

    // @ts-expect-error
    expect(parts[2][0]).toBe("7");
  });

  test("contains a valid RFC 4122 variant", () => {
    const id = uuidv7();
    const parts = id.split("-");

    // @ts-expect-error
    const variantChar = parts[3][0].toLowerCase();

    expect(["8", "9", "a", "b"]).toContain(variantChar);
  });

  test("embeds a timestamp close to Date.now()", () => {
    const before = Date.now();
    const id = uuidv7();
    const after = Date.now();

    const timestamp = extractTimestampFromUuidV7(id);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });

  test("generates unique UUIDs", () => {
    const ids = new Set();

    for (let i = 0; i < 1000; i++) {
      ids.add(uuidv7());
    }

    expect(ids.size).toBe(1000);
  });
});
