import path from "node:path";

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Configurations } from "~/common/types";
import { appConfig } from "~/configs/app.config";
import { databaseConfig } from "~/configs/database.config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [databaseConfig.KEY, appConfig.KEY],
      useFactory: async (
        dbCfg: Configurations["database"],
        appCfg: Configurations["app"]
      ) => ({
        url: dbCfg.url,
        type: dbCfg.type,
        host: dbCfg.host,
        port: dbCfg.port,
        username: dbCfg.user,
        password: dbCfg.password,
        database: dbCfg.database,
        synchronize: dbCfg.sync,
        // autoLoadEntities: true,
        entities: [path.join(__dirname, "..", "..", "**", "*.entity{.ts,.js}")],
        dropSchema: false,
        keepConnectionAlive: true,
        logging: appCfg.environment !== "production",
        migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],
        cli: {
          entitiesDir: "src",
          subscribersDir: "subscriber",
        },
        extra: {
          // based on https://node-postgres.com/apis/pool
          // max connection pool size
          max: dbCfg.maxConnections,
          ssl: dbCfg.enableSsl
            ? {
                rejectUnauthorized: dbCfg.rejectUnauthorized,
                ca: dbCfg.ca,
                key: dbCfg.key,
                cert: dbCfg.cert,
              }
            : undefined,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
