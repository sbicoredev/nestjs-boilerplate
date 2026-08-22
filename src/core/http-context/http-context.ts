import { Inject, Injectable } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { ClsService } from "nestjs-cls";

import type { NestRequest, NestResponse } from "~/common/types";

@Injectable()
export class HttpContext {
  private readonly nameSpace = "request";

  constructor(
    @Inject(REQUEST) private readonly request: NestRequest,
    private readonly clsService: ClsService
  ) {}

  public getRequest(): NestRequest {
    return this.request;
  }

  public getResponse(): NestResponse | undefined {
    return this.request.res;
  }

  public getRequestId() {
    return this.clsService.getId();
  }

  private get<T>(key: string) {
    return this.clsService.get<T>(this.getKeyWithNamespace(key));
  }

  private set(key: string, value: unknown) {
    this.clsService.set(this.getKeyWithNamespace(key), value);
  }

  private getKeyWithNamespace(key: string) {
    return `${this.nameSpace}.${key}`;
  }
}
