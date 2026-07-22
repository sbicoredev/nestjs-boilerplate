import { Module } from "@nestjs/common";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/adapters/handlebars.adapter";

import type { Configurations } from "~/common/types";
import { emailConfig } from "~/configs/email.config";

import { EmailService } from "./email.service";
import { resolveTransport } from "./resolve-transport";

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [emailConfig.KEY],
      useFactory: (cfg: Configurations["email"]) => ({
        transport: resolveTransport(cfg),
        defaults: {
          from: { name: cfg.fromName, address: cfg.fromAddress },
        },
        template: {
          // biome-ignore lint/correctness/noGlobalDirnameFilename: fix
          dir: `${__dirname}/templates`,
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
