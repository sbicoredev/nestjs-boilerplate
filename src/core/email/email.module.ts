import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";

import { emailConfig } from "~/configs/email.config";

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [emailConfig.KEY],
      useFactory: (cfg: Configurations["email"]) => ({
        transport: cfg.smtpUrl,
        defaults: {
          from: { name: cfg.fromName, address: cfg.fromAddress },
        },
        template: {
          dir: `${__dirname}/templates`,
          adapter: new HandlebarsAdapter(),

          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
})
export class EmailModule {}
