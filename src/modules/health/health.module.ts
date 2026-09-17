import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { RedisHealthIndicator } from "@nestjs-redis/health-indicator";

import { HealthController } from "./health.controller.js";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [RedisHealthIndicator],
})
export class HealthModule {}
