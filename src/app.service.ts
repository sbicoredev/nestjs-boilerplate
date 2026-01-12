import { Inject, Injectable } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";

import { HTTP_CONTEXT } from "./core/http-context/http-context.constants";
import type { HttpContext } from "./core/http-context/http-context.interface";

@Injectable()
export class AppService {
  constructor(
    private readonly i18n: I18nService,
    @Inject(HTTP_CONTEXT) private readonly httpContext: HttpContext
  ) {}

  getHello() {
    return {
      requestId: this.httpContext.getRequestId(),
      message: this.i18n.t("app.hello"),
    };
  }
}
