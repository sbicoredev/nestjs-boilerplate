import "reflect-metadata";

import { validatedConfig } from "~/common/utils/validate-config";

import { DatabaseConfig } from "./database.config";

const CONFIG_VALIDATION_FAILED = /Configuration validation failed/;

describe("DatabaseConfig", () => {
  const baseEnv = { DB_URL: "postgres://user:pass@localhost:5432/app" };

  it("applies documented defaults when only the required field is set", () => {
    const config = validatedConfig(baseEnv, DatabaseConfig);

    expect(config.type).toBe("postgres");
    expect(config.enableSSL).toBe(true);
    expect(config.connectTimeout).toBe(10);
    expect(config.maxConnections).toBe(10);
    expect(config.sync).toBe(false);
  });

  it("has no default for DB_URL, so it's genuinely required", () => {
    expect(() => validatedConfig({}, DatabaseConfig)).toThrow(
      CONFIG_VALIDATION_FAILED
    );
  });

  it("only accepts a known DB_TYPE value", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, DB_TYPE: "mongodb" }, DatabaseConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("accepts each supported DB_TYPE", () => {
    for (const type of ["postgres", "mysql", "mariadb"]) {
      const config = validatedConfig(
        { ...baseEnv, DB_TYPE: type },
        DatabaseConfig
      );
      expect(config.type).toBe(type);
    }
  });

  it("converts DB_ENABLE_SSL string values into a real boolean", () => {
    const config = validatedConfig(
      { ...baseEnv, DB_ENABLE_SSL: "false" },
      DatabaseConfig
    );
    expect(config.enableSSL).toBe(false);
  });

  it("converts DB_SYNC string values into a real boolean", () => {
    const config = validatedConfig(
      { ...baseEnv, DB_SYNC: "true" },
      DatabaseConfig
    );
    expect(config.sync).toBe(true);
  });

  it("rejects DB_CONNECT_TIMEOUT above the allowed maximum", () => {
    expect(() =>
      validatedConfig(
        { ...baseEnv, DB_CONNECT_TIMEOUT: "1000" },
        DatabaseConfig
      )
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });

  it("rejects DB_MAX_CONNECTIONS below the allowed minimum", () => {
    expect(() =>
      validatedConfig({ ...baseEnv, DB_MAX_CONNECTIONS: "0" }, DatabaseConfig)
    ).toThrow(CONFIG_VALIDATION_FAILED);
  });
});
