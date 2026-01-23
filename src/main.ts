// biome-ignore assist/source/organizeImports: opentelemetry sdk must be imported first
import { sdk } from "~/core/observability/opentelemetry";

import {
  INestApplication,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VERSION_NEUTRAL,
  VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { setupGracefulShutdown } from "@tygra/nestjs-graceful-shutdown";
import { useContainer } from "class-validator";
import helmet from "helmet";
import { Logger as PinoLogger } from "nestjs-pino";

import { AppModule } from "./app.module";
import { SWAGGER_PATH } from "./common/constants/config";
import { setupOpenApi } from "./common/utils/setup-openapi";
import { environmentMap } from "./common/constants/mappings";

async function bootstrap() {
  // start otel sdk before the app initializes to capture all telemetry
  sdk.start();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  const config = app.get(ConfigService<Configurations, true>);
  const appConfig = config.get("app", { infer: true });

  // configure trusted proxies for deployments behind load balancers or reverse proxies.
  // this enables accurate client IP extraction from X-Forwarded-For headers,
  app.set("trust proxy", appConfig.trustProxy);
  // Set a global route prefix (e.g., '/api') for all controllers.
  app.setGlobalPrefix(appConfig.globalPrefix);
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
    origin: appConfig.corsOrigins,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Accept",
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-Id",
    ],
    credentials: true,
  });

  // Configure Helmet middleware for HTTP security headers.
  // CSP directives are configured to allow resources needed for API documentation
  // (Swagger UI, Scalar) while maintaining security against XSS attacks.
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          imgSrc: [`'self'`, "data:", "cdn.jsdelivr.net"],
          fontSrc: [`'self'`, "fonts.scalar.com", "data:"],
          scriptSrc: [
            `'self'`,
            `https: 'unsafe-inline'`,
            "cdn.jsdelivr.net",
            `'unsafe-eval'`,
          ],
          styleSrc: [
            `'self'`,
            `'unsafe-inline'`,
            "cdn.jsdelivr.net",
            "fonts.googleapis.com",
            "unpkg.com",
          ],
          connectSrc: [`'self'`, "cdn.jsdelivr.net", "unpkg.com"],
        },
      },
    })
  );

  // ------------------------------
  // - Pipes, Interceptors, Filters
  // ------------------------------
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors: ValidationError[] = []) => {
        return new UnprocessableEntityException({ errors });
      },
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
      validateCustomDecorators: true,
      forbidNonWhitelisted: true,
    })
  );

  if (appConfig.environment !== environmentMap.development) {
    // enable graceful shutdown in production
    setupGracefulShutdown({ app });
  } else {
    // Enable OpenAPI documentation for development
    setupOpenApi(app, { path: SWAGGER_PATH, title: appConfig.name });
  }

  await app.listen(appConfig.port);

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
