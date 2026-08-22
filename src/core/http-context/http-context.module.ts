import { type DynamicModule, Global, Module } from "@nestjs/common";
import { isUUID } from "class-validator";
import { ClsModule } from "nestjs-cls";

import type { NestRequest } from "~/common/types";
import { uuidv7 } from "~/common/utils/uuidv7";

import { HttpContext } from "./http-context";
import { X_REQUEST_ID } from "./http-context.constants";

@Global() // Make the providers available application-wide without needing to import the module everywhere
@Module({})
export class HttpContextModule {
  static forRoot(): DynamicModule {
    return {
      module: HttpContextModule,
      imports: [
        ClsModule.forRoot({
          global: true,
          middleware: {
            mount: true,
            generateId: true,
            idGenerator: (req: NestRequest) => {
              const incomingRequestId = req.headers[X_REQUEST_ID]?.toString();
              if (incomingRequestId && isUUID(incomingRequestId)) {
                req.id = incomingRequestId;
                return req.id;
              }

              const generatedRequestId = uuidv7();
              req.id = generatedRequestId;
              req.headers[X_REQUEST_ID] = generatedRequestId;

              return generatedRequestId;
            },
          },
        }),
      ],
      providers: [HttpContext],
      exports: [HttpContext],
    };
  }
}
