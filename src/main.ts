// biome-ignore assist/source/organizeImports: opentelemetry sdk must be imported first
import { sdk } from "~/core/observability/opentelemetry";

import {
  INestApplication,
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { setupGracefulShutdown } from "@tygra/nestjs-graceful-shutdown";
import { useContainer } from "class-validator";
import compression from "compression";
import helmet from "helmet";
import { Logger as PinoLogger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { SWAGGER_PATH } from "./common/constants/config";
import { ENV_MAP } from "./common/constants/mappings";
import { HELMET_OPTIONS } from "./common/constants/security";
import type { Configurations } from "./common/types";
import { setupOpenApi } from "./common/utils/setup-openapi";

async function bootstrap() {
  // start otel sdk before the app initializes to capture all telemetry
  sdk.start();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  const configService = app.get(ConfigService<Configurations, true>);
  const appConfigs = configService.get("app", { infer: true });

  // configure trusted proxies for deployments behind load balancers or reverse proxies.
  // this enables accurate client IP extraction from X-Forwarded-For headers,
  // driven by APP_TRUST_PROXY — see docs/configuration.md's.
  // Do NOT hardcode this to `true`: that would trust X-Forwarded-For from any
  // source, which lets a caller spoof its own IP and defeat IP-based rate limiting.
  app.set("trust proxy", appConfigs.trustProxy);
  // Set a global route prefix (e.g., '/api') for all controllers.
  app.setGlobalPrefix(appConfigs.globalPrefix, {
    exclude: [
      { path: "health", method: RequestMethod.GET },
      { path: "livez", method: RequestMethod.GET },
      { path: "readyz", method: RequestMethod.GET },
    ],
  });
  // Enable URI-based API versioning (e.g., /api/v1/users).
  app.enableVersioning({
    defaultVersion: VERSION_NEUTRAL,
    type: VersioningType.URI, // '1', ['1', '2'] or VERSION_NEUTRAL allows routes without an explicit version to be accessible.
  });

  // ------------------------------
  // - Security
  // ------------------------------
  // Configure CORS to allow cross-origin requests from specified origins.
  app.enableCors({
    origin: appConfigs.corsOrigins,
    methods: appConfigs.corsAllowedMethods,
    allowedHeaders: appConfigs.corsAllowedHeaders,
    credentials: true,
  });

  // Configure Helmet middleware for HTTP security headers.
  app.use(helmet(HELMET_OPTIONS));

  // Gzip/Brotli-negotiated response compression for JSON payloads.
  app.use(compression());

  // ------------------------------
  // - Pipes, Interceptors, Filters
  // ------------------------------
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  if (appConfigs.environment === ENV_MAP.development) {
    // Enable OpenAPI documentation for development
    setupOpenApi(app, {
      path: SWAGGER_PATH,
      title: appConfigs.name,
    });
  }

  // enable graceful shutdown
  setupGracefulShutdown({ app });

  await app.listen(appConfigs.port);

  return app;
}

bootstrap()
  .then(async (app: INestApplication) => {
    const url = await app.getUrl();
    console.log(`Server listening on ${url}`);
    console.log(`Scalar OpenAPI is running on: ${url}${SWAGGER_PATH}`);
  })
  .catch((err) => {
    console.error(err);
  });
