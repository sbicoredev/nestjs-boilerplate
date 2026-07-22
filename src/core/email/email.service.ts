import { Injectable, Logger } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

import { EMAIL_TEMPLATE_MAP } from "~/common/constants/mappings";

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: keyof typeof EMAIL_TEMPLATE_MAP;
  /** Handlebars template variables (see core/email/templates/*.hbs) */
  context?: Record<string, unknown>;
}

@Injectable()
export class EmailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly logger: Logger
  ) {}

  /**
   * Sends a templated email via the transport configured in
   * EmailModule (SMTP by default; see EMAIL_PROVIDER in
   * src/configs/email.config.ts for the other supported values).
   *
   * Deliberately narrow: this covers the one thing every downstream
   * project needs (send a templated email, know if it failed) without
   * guessing at retry/queueing requirements that vary a lot per project
   * — add a queue (e.g. BullMQ) in front of this if you need delivery
   * guarantees beyond "the SMTP server accepted it."
   */
  async send(options: SendEmailOptions): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: options.to,
        subject: options.subject,
        template: EMAIL_TEMPLATE_MAP[options.template],
        context: options.context ?? {},
      });
    } catch (error) {
      // Deliberately not logging `options.to` here — recipient email
      // addresses aren't in loggingRedactPaths (core/observability/logger)
      // since that list only covers req.body.email on inbound requests,
      // not arbitrary application logs.
      this.logger.error(
        `Failed to send "${options.template}" email: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
