import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GracefulShutdownModule } from "@tygra/nestjs-graceful-shutdown";

import appConfig from "~/configs/app.config";

import { LocalizationModule } from "./localization/localization.module";

@Module({
  imports: [
    GracefulShutdownModule.forRoot(),
    ConfigModule.forRoot({
      load: [appConfig],
      expandVariables: true,
      skipProcessEnv: true,
      cache: true,
      isGlobal: true,
    }),
    LocalizationModule,
  ],
})
export class CoreModule {}
