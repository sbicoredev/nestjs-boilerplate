// biome-ignore-all lint/suspicious/noUnnecessaryConditions: explain

import type { Configurations } from "~/common/types";

/**
 * Resolves the Nodemailer transport string for MailerModule based on
 * EMAIL_PROVIDER. Pulled out of email.module.ts's useFactory so this
 * branching logic (previously entirely unused — EmailConfig.provider was
 * parsed and validated but never read anywhere) is unit-testable on its
 * own.
 */
export function resolveTransport(cfg: Configurations["email"]): string {
  switch (cfg.provider) {
    case "smtp":
      return cfg.smtpUrl;
    case "sendgrid":
      // SendGrid via its SMTP relay — no extra SDK dependency needed,
      // this is still "just" an SMTP transport under the hood.
      if (!cfg.sendgridApiKey) {
        throw new Error(
          "EMAIL_PROVIDER=sendgrid requires SENDGRID_API_KEY to be set."
        );
      }
      return `smtps://apikey:${encodeURIComponent(cfg.sendgridApiKey)}@smtp.sendgrid.net:465`;
    case "ses":
      // Not implemented — SES needs the AWS SDK and an API-based
      // transport, not an SMTP URL, which is a materially bigger
      // addition than this starter's email module currently covers.
      throw new Error(
        "EMAIL_PROVIDER=ses is not implemented in this starter yet. " +
          "Use 'smtp' or 'sendgrid', or add AWS SES SDK integration here."
      );
    default:
      throw new Error(`Unknown EMAIL_PROVIDER: ${cfg.provider}`);
  }
}
