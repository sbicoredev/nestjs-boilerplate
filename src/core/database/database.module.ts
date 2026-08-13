import { Module } from "@nestjs/common";
import { TypeOrmModule, type TypeOrmModuleOptions } from "@nestjs/typeorm";

import type { Configurations } from "~/common/types";
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
          connectTimeoutMS: dbCfg.connectTimeout * 1000,
          poolSize: dbCfg.maxConnections,
          autoLoadEntities: true,
          synchronize: appCfg.environment !== "production" && dbCfg.sync,
          logging: appCfg.environment === "development",
          // Migrations are applied explicitly via `pnpm run migration:run`,
          // never automatically at app boot —
          // running them from every replica's startup would race. This
          // just lets the running app see the same migrations directory
          // the CLI uses, for tooling/introspection purposes.
          migrations: ["dist/database/migrations/*.js"],
          migrationsRun: false,
        }) satisfies TypeOrmModuleOptions,
    }),
  ],
})
export class DatabaseModule {}
