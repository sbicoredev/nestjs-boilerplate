import { Global, Logger, Module, type Provider, Scope } from "@nestjs/common";
import { INQUIRER } from "@nestjs/core";
import { LoggerModule as PinoModule } from "nestjs-pino";
import { TransportPipelineOptions } from "pino";

import type { Configurations } from "~/common/types";
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
      useFactory: async (appConfigs: Configurations["app"]) => ({
        forRoutes: ["/"],
        exclude: ["/health{z}", "/ready{z}", "/live{z}"],
        pinoHttp: {
          level: appConfigs.logLevel,
          autoLogging: appConfigs.environment !== "test",
          customProps: () => ({ context: "HttpRequest" }),
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
          serializers: {
            req: (req) => {
              const {
                host,
                connection,
                "user-agent": userAgent,
                "x-request-id": requestIdHeader,
              } = req.headers;
              return {
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                headers: {
                  host,
                  connection,
                  "x-request": requestIdHeader,
                  "user-agent": userAgent,
                },
                ...(appConfigs.debug ? { body: req.raw.body } : {}),
              };
            },
            res: ({ headers, ...res }) => ({
              statusCode: res.statusCode,
            }),
            err: () => undefined,
          },
          redact: { paths: loggingRedactPaths },
          transport: {
            targets: [
              {
                ...(appConfigs.logService === "console"
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
                ...(appConfigs.logService === "opentelemetry"
                  ? {
                      level: appConfigs.logLevel,
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
