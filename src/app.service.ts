import { Injectable } from "@nestjs/common";
import { I18nService } from "nestjs-i18n";

import { HttpContext } from "./core/http-context/http-context";

@Injectable()
export class AppService {
  constructor(
    private readonly i18n: I18nService,
    private readonly httpContext: HttpContext
  ) {}

  getOk() {
    return {
      requestId: this.httpContext.getRequestId(),
      message: this.i18n.t("app.ok"),
    };
  }
}
