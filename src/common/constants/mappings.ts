export const ENV_MAP = {
  development: "development",
  staging: "staging",
  production: "production",
  test: "test",
} as const;

export const LOG_LEVEL_MAP = {
  trace: "trace",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
} as const;

export const LOG_SERVICE_MAP = {
  console: "console",
  opentelemetry: "opentelemetry",
} as const;

export const DB_MAP = {
  postgres: "postgres",
  mysql: "mysql",
  mariadb: "mariadb",
} as const;

export const EMAIL_TEMPLATE_MAP = {
  "verify-email": "verify-email",
  "reset-password": "reset-password",
} as const;

export const EMAIL_PROVIDER_MAP = {
  smtp: "smtp",
  sendgrid: "sendgrid",
  ses: "ses",
} as const;
