import { CacheInterceptor } from "@nestjs/cache-manager";
import { Controller, Get, UseInterceptors } from "@nestjs/common";

import { AppService } from "./app.service";

@UseInterceptors(CacheInterceptor)
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHello() {
    await new Promise((r) => {
      setTimeout(() => r(true), 1000);
    });
    return this.appService.getHello();
  }
}
