import path from "node:path";

import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from "nestjs-i18n";

@Module({
  imports: [
    I18nModule.forRootAsync({
      resolvers: [
        { use: QueryResolver, options: ["lang"] },
        AcceptLanguageResolver,
        new HeaderResolver(["x-lang"]),
      ],
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configs: ConfigService<Configurations>) => {
        const cfg = configs.getOrThrow("app", { infer: true });
        return {
          fallbackLanguage: cfg.fallbackLanguage,
          loaderOptions: {
            path: path.join(__dirname, "/i18n/"),
            watch: true,
          },
          typesOutputPath: path.join(
            __dirname,
            "../../../src/generated/i18n.generated.ts"
          ),
          logging: cfg.environment === "development",
        };
      },
    }),
  ],
})
export class LocalizationModule {}
