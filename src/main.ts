import {
  INestApplication,
  VERSION_NEUTRAL,
  VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { Configurations } from "./common/types";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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

  await app.listen(appConfig.port);

  return app;
}

bootstrap()
  .then(async (app: INestApplication) => {
    const url = await app.getUrl();
    console.log(`Server listening on ${url.toString()}`);
  })
  .catch((err) => {
    console.error(err);
  });
