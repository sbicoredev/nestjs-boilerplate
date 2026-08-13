import { type DynamicModule, Global, Module } from "@nestjs/common";
import { ClsModule } from "nestjs-cls";

import { X_REQUEST_ID } from "~/common/constants/http";
import type { NestRequest } from "~/common/types";
import { uuidv7 } from "~/common/utils/uuidv7";

import { NestHttpContext } from "./http-context";
import { HTTP_CONTEXT } from "./http-context.constants";

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
              const reqId = req.headers[X_REQUEST_ID];
              if (reqId) {
                req.id = reqId.toString();
                return req.id;
              }
              const id = "req_".concat(uuidv7());
              req.id = id;
              req.headers[X_REQUEST_ID] = id;

              return id;
            },
          },
        }),
      ],
      providers: [{ provide: HTTP_CONTEXT, useClass: NestHttpContext }],
      exports: [HTTP_CONTEXT], // Export the interface so other modules can use it
    };
  }
}
