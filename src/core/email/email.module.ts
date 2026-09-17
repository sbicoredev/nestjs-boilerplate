import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/adapters/handlebars.adapter";

import type { Configurations } from "~/common/types.js";
import { emailConfig } from "~/configs/email.config.js";

import { EmailService } from "./email.service.js";
import { resolveTransport } from "./resolve-transport.js";

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [],
      inject: [emailConfig.KEY],
      useFactory: (emailConfigs: Configurations["email"]) => ({
        transport: resolveTransport(emailConfigs),
        defaults: {
          from: {
            name: emailConfigs.fromName,
            address: emailConfigs.fromAddress,
          },
        },
        template: {
          dir: `${import.meta.dirname}/templates`,
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
