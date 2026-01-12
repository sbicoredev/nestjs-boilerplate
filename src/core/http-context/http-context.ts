import { Inject, Injectable } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { ClsService } from "nestjs-cls";

import { HttpContext } from "./http-context.interface";

@Injectable()
export class NestHttpContext implements HttpContext {
  private readonly nameSpace = "request";

  constructor(
    @Inject(REQUEST) private readonly request: NestRequest,
    private readonly cls: ClsService
  ) {}

  public getRequest(): NestRequest {
    return this.request;
  }

  public getResponse(): NestResponse | undefined {
    return this.request.res;
  }

  public getRequestId() {
    return this.cls.getId();
  }

  private get<T>(key: string) {
    return this.cls.get<T>(this.getKeyWithNamespace(key));
  }

  private set(key: string, value: unknown) {
    this.cls.set(this.getKeyWithNamespace(key), value);
  }

  private getKeyWithNamespace(key: string) {
    return `${this.nameSpace}.${key}`;
  }
}
