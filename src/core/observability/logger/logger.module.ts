import { Global, Logger, Module, Provider, Scope } from "@nestjs/common";
import { INQUIRER } from "@nestjs/core";
import { LoggerModule as PinoModule } from "nestjs-pino";
import { TransportPipelineOptions } from "pino";

import { appConfig } from "~/configs/app.config";

// remove value of these paths from logs
export const loggingRedactPaths = [
  "req.headers.authorization",
  "req.headers.proxy-authorization",
  "req.headers.x-api-key",
  "req.body.token",
  "req.body.refreshToken",
  "req.body.email",
  "req.body.password",
  "req.body.oldPassword",
  "req.body.newPassword",
];

const loggerProvider: Provider = {
  provide: Logger,
  scope: Scope.TRANSIENT,
  inject: [INQUIRER],
  useFactory: (parent: object) => new Logger(parent.constructor.name),
};

@Global()
@Module({
  imports: [
    PinoModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: async (cfg: Configurations["app"]) => ({
        forRoutes: ["/"],
        exclude: ["/health{z}", "/ready{z}", "/live{z}"],
        pinoHttp: {
          level: cfg.logLevel,
          autoLogging: true,
          customProps: () => ({ context: "Http" }),
          customLogLevel: (_, res, err) => {
            if (res.statusCode >= 500 || err) {
              return "error";
            }
            if (res.statusCode >= 400) {
              return "warn";
            }
            return "info";
          },
          quietReqLogger: true,
          // quietResLogger: true,
          customSuccessMessage(req, res, responseTime) {
            return `Request: ${req.id} ${req.method} ${req.url} "${res.statusMessage}" req-length=${req.headers["content-length"] ?? 0} status=${res.statusCode} res-length=${res.getHeader("content-length") ?? 0} duration=${responseTime}ms`;
          },
          customErrorMessage(req, res, error) {
            return `Request: ${req.id} ${req.method} ${req.url} "${error.message}" req-length=${req.headers["content-length"] ?? 0} status=${res.statusCode} res-length=${res.getHeader("content-length") ?? 0}`;
          },
          serializers: cfg.debug
            ? {
                req: (req) => {
                  req.body = req.raw.body;
                  return req;
                },
              }
            : undefined,
          redact: { paths: loggingRedactPaths, censor: "**GDPR COMPLIANT**" },
          transport: {
            targets: [
              {
                ...(cfg.logService === "console"
                  ? {
                      target: "pino-pretty",
                      options: {
                        colorize: true,
                        singleLine: true,
                        ignore: "pid,hostname",
                        messageFormat: "[{context}] {msg}",
                      },
                    }
                  : ({} as TransportPipelineOptions)),
              },
              {
                ...(cfg.logService === "opentelemetry"
                  ? {
                      level: cfg.logLevel,
                      target: "pino-opentelemetry-transport",
                    }
                  : ({} as TransportPipelineOptions)),
              },
            ],
          },
        },
      }),
    }),
  ],
  providers: [loggerProvider],
  exports: [loggerProvider],
})
export class LoggerModule {}
