import {
  Module,
  UnprocessableEntityException,
  ValidationPipe,
} from "@nestjs/common";
import { APP_FILTER, APP_PIPE } from "@nestjs/core";

import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { CoreModule } from "./core/core.module.js";
import { GlobalExceptionFilter } from "./core/filters/global-exception.filter.js";
import { HealthModule } from "./modules/health/health.module.js";
import { TodoModule } from "./modules/todo/todo.module.js";

@Module({
  imports: [CoreModule, HealthModule, TodoModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          exceptionFactory: (errors) =>
            new UnprocessableEntityException(errors),
          whitelist: true,
          transform: true,
          forbidUnknownValues: false,
          validateCustomDecorators: true,
          forbidNonWhitelisted: true,
        }),
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
