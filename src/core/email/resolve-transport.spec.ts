// biome-ignore-all lint/performance/useTopLevelRegex: explain

import { describe, expect, it } from "vitest";

import type { Configurations } from "~/common/types";

import { resolveTransport } from "./resolve-transport";

function baseCfg(
  overrides: Partial<Configurations["email"]> = {}
): Configurations["email"] {
  return {
    provider: "smtp",
    fromAddress: "dev@example.com",
    fromName: "Test",
    smtpUrl: "smtp://localhost:1025",
    connectTimeout: 10,
    ...overrides,
  } as Configurations["email"];
}

describe("resolveTransport", () => {
  it("returns the configured SMTP URL for provider=smtp", () => {
    const cfg = baseCfg({ provider: "smtp", smtpUrl: "smtp://example:1025" });
    expect(resolveTransport(cfg)).toBe("smtp://example:1025");
  });

  it("builds a SendGrid SMTP-relay URL for provider=sendgrid", () => {
    const cfg = baseCfg({ provider: "sendgrid", sendgridApiKey: "SG.abc123" });
    expect(resolveTransport(cfg)).toBe(
      "smtps://apikey:SG.abc123@smtp.sendgrid.net:465"
    );
  });

  it("URL-encodes special characters in the SendGrid API key", () => {
    const cfg = baseCfg({ provider: "sendgrid", sendgridApiKey: "a/b+c=d" });
    expect(resolveTransport(cfg)).toBe(
      "smtps://apikey:a%2Fb%2Bc%3Dd@smtp.sendgrid.net:465"
    );
  });

  it("throws for provider=sendgrid with no API key configured", () => {
    const cfg = baseCfg({ provider: "sendgrid", sendgridApiKey: undefined });
    expect(() => resolveTransport(cfg)).toThrow(/SENDGRID_API_KEY/);
  });

  it("throws a clear not-implemented error for provider=ses", () => {
    const cfg = baseCfg({ provider: "ses" });
    expect(() => resolveTransport(cfg)).toThrow(/not implemented/i);
  });
});
