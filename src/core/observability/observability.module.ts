import { Module } from "@nestjs/common";

import { LoggerModule } from "./logger/logger.module";

@Module({
  imports: [LoggerModule],
  providers: [],
  exports: [],
})
export class ObservabilityModule {}
