import "reflect-metadata";

import { validatedConfig } from "~/common/utils/validate-config";

import { EmailConfig } from "./email.config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;

describe("EmailConfig", () => {
  const baseEnv = {
    EMAIL_FROM_ADDRESS: "noreply@example.com",
    EMAIL_FROM_NAME: "Example App",
  };

  it("applies documented defaults when only the required fields are set", () => {
    const config = validatedConfig(baseEnv, EmailConfig);

    expect(config.provider).toBe("smtp");
    expect(config.smtpUrl).toBe("smtp://localhost:1025");
    expect(config.connectTimeout).toBe(10);
    expect(config.sendgridApiKey).toBeUndefined();
  });

  it("has no default for EMAIL_FROM_ADDRESS, so it's genuinely required", () => {
    expect(() =>
      validatedConfig({ EMAIL_FROM_NAME: "Example App" }, EmailConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("has no default for EMAIL_FROM_NAME, so it's genuinely required", () => {
    expect(() =>
      validatedConfig(
        { EMAIL_FROM_ADDRESS: "noreply@example.com" },
        EmailConfig
      )
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("only accepts a known EMAIL_PROVIDER value", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, EMAIL_PROVIDER: "mailgun" }, EmailConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("accepts provider=smtp and provider=ses without a SendGrid key", () => {
    for (const provider of ["smtp", "ses"]) {
      const config = validatedConfig(
        { ...baseEnv, EMAIL_PROVIDER: provider },
        EmailConfig
      );
      expect(config.provider).toBe(provider);
    }
  });

  it("accepts provider=sendgrid when SENDGRID_API_KEY is also set", () => {
    const config = validatedConfig(
      {
        ...baseEnv,
        EMAIL_PROVIDER: "sendgrid",
        SENDGRID_API_KEY: "SG.test-key",
      },
      EmailConfig
    );
    expect(config.provider).toBe("sendgrid");
    expect(config.sendgridApiKey).toBe("SG.test-key");
  });

  it("rejects provider=sendgrid with no SENDGRID_API_KEY (previously silently accepted and silently ignored)", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, EMAIL_PROVIDER: "sendgrid" }, EmailConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("accepts a custom SMTP_URL", () => {
    const config = validatedConfig(
      { ...baseEnv, SMTP_URL: "smtp://mailhost:587" },
      EmailConfig
    );
    expect(config.smtpUrl).toBe("smtp://mailhost:587");
  });

  it("rejects SMTP_CONNECT_TIMEOUT above the allowed maximum", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, SMTP_CONNECT_TIMEOUT: "1000" }, EmailConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  // EmailModule now does branch on `provider` (see
  // src/core/email/resolve-transport.ts + resolve-transport.spec.ts) —
  // this file only tests the config shape/validation, not transport
  // selection.
});
