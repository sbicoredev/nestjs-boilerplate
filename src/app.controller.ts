import { Controller, Get, Logger } from "@nestjs/common";

import { AppService } from "./app.service";

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly logger: Logger
  ) {}

  @Get()
  async getHello() {
    this.logger.log("executing getHello");
    await new Promise((r) => {
      setTimeout(() => r(true), 1000);
    });
    return this.appService.getHello();
  }
}
