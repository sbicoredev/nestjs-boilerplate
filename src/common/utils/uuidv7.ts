// biome-ignore-all lint/suspicious/noBitwiseOperators: explain
import { randomBytes } from "node:crypto";

export function uuidv7(): string {
  const bytes = randomBytes(16);

  // 48-bit big-endian Unix timestamp in milliseconds
  bytes.writeUIntBE(Date.now(), 0, 6);

  // Set version to 7
  // @ts-expect-error
  bytes[6] = (bytes[6] & 0x0f) | 0x70;

  // Set RFC 4122 variant bits
  // @ts-expect-error
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}
