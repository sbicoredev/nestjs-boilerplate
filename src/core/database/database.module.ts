import { Module } from "@nestjs/common";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";

import { appConfig } from "~/configs/app.config";
import { databaseConfig } from "~/configs/database.config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY, appConfig.KEY],
      useFactory: async (
        dbCfg: Configurations["database"],
        appCfg: Configurations["app"]
      ) =>
        ({
          type: dbCfg.type,
          url: dbCfg.url,
          ssl: dbCfg.enableSSL,
          connectTimeoutMS: dbCfg.connectTimeout * 1000,
          poolSize: dbCfg.maxConnections,
          autoLoadEntities: true,
          synchronize: appCfg.environment !== "production" && dbCfg.sync,
          logging: appCfg.environment !== "production",
        }) satisfies TypeOrmModuleOptions,
    }),
  ],
})
export class DatabaseModule {}
