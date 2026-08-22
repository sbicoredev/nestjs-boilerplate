import "reflect-metadata";

import v8 from "node:v8";

import {
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { RedisHealthIndicator } from "@nestjs-redis/health-indicator";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: { check: Mock };
  let memoryHealthIndicator: { checkHeap: Mock; checkRSS: Mock };
  let databaseHealthIndicator: { pingCheck: Mock };
  let redisHealthIndicator: { isHealthy: Mock };
  const redisRatelimitClient = { fakeClient: true };

  beforeEach(() => {
    healthCheckService = { check: vi.fn() };
    memoryHealthIndicator = { checkHeap: vi.fn(), checkRSS: vi.fn() };
    databaseHealthIndicator = { pingCheck: vi.fn() };
    redisHealthIndicator = { isHealthy: vi.fn() };

    controller = new HealthController(
      healthCheckService as unknown as HealthCheckService,
      memoryHealthIndicator as unknown as MemoryHealthIndicator,
      databaseHealthIndicator as unknown as TypeOrmHealthIndicator,
      redisHealthIndicator as unknown as RedisHealthIndicator,
      redisRatelimitClient as never
    );
  });

  describe("checkHealth", () => {
    it("delegates to HealthCheckService.check with a list of indicator functions", async () => {
      healthCheckService.check.mockReturnValue({
        status: "ok",
        checks: {},
      });

      const result = await controller.checkHealth();

      expect(healthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
      const checks = healthCheckService.check.mock.calls[0]?.[0] as unknown[];
      expect(checks).toHaveLength(4);
      expect(result).toEqual({
        status: "ok",
        checks: {},
      });
    });

    it("checks memory heap usage against a 70% threshold of heap_size_limit", async () => {
      healthCheckService.check.mockImplementation(
        (checks: Array<() => unknown>) => checks.map((c) => c())
      );
      memoryHealthIndicator.checkHeap.mockReturnValue({
        memory_heap: { status: "up" },
      });

      await controller.checkHealth();
      const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;

      expect(memoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        "memory_heap",
        heapLimitBytes * 0.7
      );
    });

    it("pings the database with a 5 second timeout", async () => {
      healthCheckService.check.mockImplementation(
        (checks: Array<() => unknown>) => checks.map((c) => c())
      );
      databaseHealthIndicator.pingCheck.mockReturnValue({
        database: { status: "up" },
      });

      await controller.checkHealth();

      expect(databaseHealthIndicator.pingCheck).toHaveBeenCalledWith(
        "database",
        { timeout: 5000 }
      );
    });

    it("checks Redis health using the rate-limiter connection", async () => {
      healthCheckService.check.mockImplementation(
        (checks: Array<() => unknown>) => checks.map((c) => c())
      );
      redisHealthIndicator.isHealthy.mockReturnValue({
        "redis-ratelimit": { status: "up" },
      });

      await controller.checkHealth();

      expect(redisHealthIndicator.isHealthy).toHaveBeenCalledWith(
        "redis-ratelimit",
        {
          client: redisRatelimitClient,
        }
      );
    });

    it("propagates a down Redis indicator through to HealthCheckService (aggregation itself is Terminus's job, not this controller's)", () => {
      healthCheckService.check.mockImplementation(
        (checks: Array<() => unknown>) => checks.map((c) => c())
      );
      redisHealthIndicator.isHealthy.mockImplementation(() => {
        throw new Error("redis-ratelimit is not available");
      });

      expect(controller.checkHealth()).rejects.toThrow(
        "redis-ratelimit is not available"
      );
    });
  });

  describe("readyz", () => {
    it("delegates to HealthCheckService.check with only a database check", () => {
      healthCheckService.check.mockReturnValue({
        status: "ok",
        checks: { database: { status: "up" } },
      });

      const result = controller.readyz();

      expect(healthCheckService.check).toHaveBeenCalledWith(expect.any(Array));
      const checks = healthCheckService.check.mock.calls[0]?.[0] as unknown[];
      expect(checks).toHaveLength(1);
      expect(result).toEqual({
        status: "ok",
        checks: { database: { status: "up" } },
      });
    });

    it("pings the database with a 5 second timeout, same as the full health check", () => {
      healthCheckService.check.mockImplementation(
        (checks: Array<() => unknown>) => checks.map((c) => c())
      );
      databaseHealthIndicator.pingCheck.mockReturnValue({
        database: { status: "up" },
      });

      controller.readyz();

      expect(databaseHealthIndicator.pingCheck).toHaveBeenCalledWith(
        "database",
        { timeout: 5000 }
      );
    });

    it("does not check memory or the rate-limiter Redis connection", () => {
      healthCheckService.check.mockImplementation(
        (checks: Array<() => unknown>) => checks.map((c) => c())
      );
      databaseHealthIndicator.pingCheck.mockReturnValue({
        database: { status: "up" },
      });

      controller.readyz();

      expect(memoryHealthIndicator.checkHeap).not.toHaveBeenCalled();
      expect(redisHealthIndicator.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe("livez", () => {
    it("returns a static ok status without checking any dependency", () => {
      expect(controller.livez()).toEqual({ status: "ok" });
      expect(healthCheckService.check).not.toHaveBeenCalled();
    });
  });
});
