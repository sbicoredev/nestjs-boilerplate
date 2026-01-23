export const environmentMap = {
  development: "development",
  staging: "staging",
  production: "production",
  test: "test",
} as const;

export const logLevelMap = {
  trace: "trace",
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
  fatal: "fatal",
} as const;

export const logServiceMap = {
  console: "console",
  opentelemetry: "opentelemetry",
} as const;

export const dbMap = {
  postgres: "postgres",
  mysql: "mysql",
  mariadb: "mariadb",
} as const;

export const emailTemplateMap = {
  "verify-email": "verify-email",
  "reset-password": "reset-password",
} as const;

export const emailProviderMap = {
  smtp: "smtp",
  sendgrid: "sendgrid",
  ses: "ses",
} as const;
