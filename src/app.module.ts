import {
  Module,
  UnprocessableEntityException,
  type ValidationError,
  ValidationPipe,
} from "@nestjs/common";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { CoreModule } from "./core/core.module";
import { GlobalExceptionFilter } from "./core/filters/global-exception.filter";
import { UnprocessableEntityExceptionFilter } from "./core/filters/unprocessable-entity-exception.filter";
import { HealthModule } from "./modules/health/health.module";
import { TodoModule } from "./modules/todo/todo.module";

@Module({
  imports: [CoreModule, HealthModule, TodoModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          exceptionFactory: (errors: ValidationError[] = []) =>
            new UnprocessableEntityException({ errors }),
          whitelist: true,
          transform: true,
          forbidUnknownValues: false,
          validateCustomDecorators: true,
          forbidNonWhitelisted: true,
        }),
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_FILTER, useClass: UnprocessableEntityExceptionFilter },
    // { provide: APP_FILTER, useClass: HealthCheckExceptionFilter },
  ],
})
export class AppModule {}
