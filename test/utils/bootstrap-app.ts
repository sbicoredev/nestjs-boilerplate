import {
  INestApplication,
  RequestMethod,
  VERSION_NEUTRAL,
  VersioningType,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { Test, TestingModule, TestingModuleBuilder } from "@nestjs/testing";
import { setupGracefulShutdown } from "@tygra/nestjs-graceful-shutdown";
import { useContainer } from "class-validator";
import compression from "compression";
import helmet from "helmet";
import { App } from "supertest/types";

import { AppModule } from "../../src/app.module";
import { HELMET_OPTIONS } from "../../src/common/constants/security";
import { Configurations } from "../../src/common/types";

/**
 * Boots a real NestExpressApplication backed by AppModule for e2e tests,
 * against whatever Postgres/Redis the current `.env` points at.
 *
 * TestingModule.createNestApplication() + app.init() does NOT run main.ts,
 * so anything main.ts's bootstrap() sets up imperatively (global prefix,
 * versioning, CORS, Helmet, graceful shutdown) has to be
 * replicated here, or e2e requests silently hit the wrong routes / skip
 * behavior the real app has. This mirrors that function line for line
 * (see src/main.ts) with two intentional differences:
 *  - It never calls setupOpenApi(), since e2e tests don't need Scalar docs.
 *  - It always calls setupGracefulShutdown({ app }), regardless of
 *    NODE_ENV. @tygra/nestjs-graceful-shutdown registers a process-exit
 *    check when its module loads; skipping this call causes a spurious
 *    "Test suite failed to run" error and an open handle that stops Jest
 *    from exiting cleanly.
 *
 * @param customizeModule optional hook to call `.overrideProvider(...)` (or
 *   similar) on the TestingModuleBuilder before it's compiled — e.g. to
 *   isolate a specific health indicator from real environment conditions
 *   like Node process memory pressure.
 */
export async function createTestApp(
  customizeModule: (builder: TestingModuleBuilder) => TestingModuleBuilder = (
    builder
  ) => builder
): Promise<INestApplication<App>> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  const moduleFixture: TestingModule = await customizeModule(builder).compile();

  const app = moduleFixture.createNestApplication<NestExpressApplication>();

  const config = app.get(ConfigService<Configurations, true>);
  const appConfig = config.get("app", { infer: true });

  app.set("trust proxy", appConfig.trustProxy);
  app.setGlobalPrefix(appConfig.globalPrefix, {
    exclude: [
      { path: "health", method: RequestMethod.GET },
      { path: "livez", method: RequestMethod.GET },
      { path: "readyz", method: RequestMethod.GET },
    ],
  });
  app.enableVersioning({
    defaultVersion: VERSION_NEUTRAL,
    type: VersioningType.URI,
  });

  app.enableCors({
    origin: appConfig.corsOrigins,
    methods: appConfig.corsAllowedMethods,
    allowedHeaders: appConfig.corsAllowedHeaders,
    credentials: true,
  });

  app.use(helmet(HELMET_OPTIONS));
  app.use(compression());

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  await app.init();
  await app.listen(0);
  setupGracefulShutdown({ app });

  return app as unknown as INestApplication<App>;
}
