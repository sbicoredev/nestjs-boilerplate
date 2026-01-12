import { DynamicModule, Global, Module } from "@nestjs/common";
import { nanoid } from "nanoid";
import { ClsModule } from "nestjs-cls";

import { X_REQUEST_ID } from "~/common/constants/http";

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
              } else {
                req.headers[X_REQUEST_ID] = req.id = "req_".concat(nanoid());
              }

              return req.id;
            },
          },
        }),
      ],
      providers: [{ provide: HTTP_CONTEXT, useClass: NestHttpContext }],
      exports: [HTTP_CONTEXT], // Export the interface so other modules can use it
    };
  }
}
