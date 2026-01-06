import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import appConfig from "~/configs/app.config";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [appConfig],
      expandVariables: true,
      skipProcessEnv: true,
      cache: true,
      isGlobal: true,
    }),
  ],
})
export class CoreModule {}
