import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GracefulShutdownModule } from "@tygra/nestjs-graceful-shutdown";

import { appConfig } from "~/configs/app.config";
import { databaseConfig } from "~/configs/database.config";

import { DatabaseModule } from "./database/database.module";
import { LocalizationModule } from "./localization/localization.module";

@Module({
  imports: [
    GracefulShutdownModule.forRoot(),
    ConfigModule.forRoot({
      load: [appConfig, databaseConfig],
      expandVariables: true,
      skipProcessEnv: true,
      cache: true,
      isGlobal: true,
    }),
    LocalizationModule,
    DatabaseModule,
  ],
})
export class CoreModule {}
