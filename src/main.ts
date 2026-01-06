import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module";
import { Configurations } from "./common/types";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const config = app.get(ConfigService<Configurations, true>);
  const appConfig = config.get("app", { infer: true });

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
