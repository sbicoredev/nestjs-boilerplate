import dotenv from "dotenv";
import { DataSource } from "typeorm";

/**
 * Standalone DataSource used ONLY by the TypeORM migration CLI
 * (`pnpm run migration:*`), not by the running application.
 *
 * This is a deliberate, narrow exception to "never read process.env
 * outside src/configs/*.config.ts": the migration CLI runs as a plain
 * Node/ts-node script outside Nest's DI container, so there is no
 * ConfigService / validatedConfig() available to it. It reads the same
 * env vars as src/configs/database.config.ts (DB_URL, DB_TYPE,
 * DB_ENABLE_SSL) and the same .env file precedence as
 * core/core.module.ts (`.env.test.local` under NODE_ENV=test, else
 * `.env`), but does its own lightweight, unvalidated parsing rather than
 * pulling in class-validator for a script this small.
 *
 * `synchronize` is always false here — this DataSource exists precisely
 * so schema changes go through reviewable migrations instead.
 */

const isProduction = process.env.NODE_ENV === "production";
const isTest = process.env.NODE_ENV === "test";

dotenv.config({ path: isTest ? ".env.test.local" : ".env" });

const enableSSL = process.env.DB_ENABLE_SSL !== "false";
const sslRejectUnauthorized =
  process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false";

export default new DataSource({
  type:
    (process.env.DB_TYPE as "mariadb" | "mysql" | "postgres" | undefined) ??
    "postgres",
  url: process.env.DB_URL,
  ssl: enableSSL ? { rejectUnauthorized: sslRejectUnauthorized } : false,
  entities: [isProduction ? "dist/**/*.entity.js" : "src/**/*.entity.ts"],
  migrations: [
    isProduction ? "dist/database/migrations/*.js" : "database/migrations/*.ts",
  ],
  migrationsTableName: "migrations",
  synchronize: false,
  logging: !isTest,
});
