import { Injectable } from "@nestjs/common";
import { ClsService } from "nestjs-cls";

@Injectable()
export class HttpContext {
  private readonly nameSpace = "request";

  constructor(private readonly clsService: ClsService) {}

  public getRequestId() {
    return this.clsService.getId();
  }

  private get<T>(key: string) {
    return this.clsService.get<T>(this.buildKey(key));
  }

  private set(key: string, value: unknown) {
    this.clsService.set(this.buildKey(key), value);
  }

  private buildKey(key: string) {
    return `${this.nameSpace}.${key}`;
  }
}
