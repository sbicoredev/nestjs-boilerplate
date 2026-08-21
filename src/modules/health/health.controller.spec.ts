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
  let health: { check: Mock };
  let memory: { checkHeap: Mock; checkRSS: Mock };
  let db: { pingCheck: Mock };
  let redis: { isHealthy: Mock };
  const redisRatelimitClient = { fakeClient: true };

  beforeEach(() => {
    health = { check: vi.fn() };
    memory = { checkHeap: vi.fn(), checkRSS: vi.fn() };
    db = { pingCheck: vi.fn() };
    redis = { isHealthy: vi.fn() };

    controller = new HealthController(
      health as unknown as HealthCheckService,
      memory as unknown as MemoryHealthIndicator,
      db as unknown as TypeOrmHealthIndicator,
      redis as unknown as RedisHealthIndicator,
      redisRatelimitClient as never
    );
  });

  describe("checkHealth", () => {
    it("delegates to HealthCheckService.check with a list of indicator functions", async () => {
      health.check.mockReturnValue({
        status: "ok",
        checks: {},
      });

      const result = await controller.checkHealth();

      expect(health.check).toHaveBeenCalledWith(expect.any(Array));
      const checks = health.check.mock.calls[0]?.[0] as unknown[];
      expect(checks).toHaveLength(4);
      expect(result).toEqual({
        status: "ok",
        checks: {},
      });
    });

    it("checks memory heap usage against a 70% threshold of heap_size_limit", async () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      memory.checkHeap.mockReturnValue({ memory_heap: { status: "up" } });

      await controller.checkHealth();
      const heapLimitBytes = v8.getHeapStatistics().heap_size_limit;

      expect(memory.checkHeap).toHaveBeenCalledWith(
        "memory_heap",
        heapLimitBytes * 0.7
      );
    });

    it("pings the database with a 5 second timeout", async () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      db.pingCheck.mockReturnValue({ database: { status: "up" } });

      await controller.checkHealth();

      expect(db.pingCheck).toHaveBeenCalledWith("database", { timeout: 5000 });
    });

    it("checks Redis health using the rate-limiter connection", async () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      redis.isHealthy.mockReturnValue({ "redis-ratelimit": { status: "up" } });

      await controller.checkHealth();

      expect(redis.isHealthy).toHaveBeenCalledWith("redis-ratelimit", {
        client: redisRatelimitClient,
      });
    });

    it("propagates a down Redis indicator through to HealthCheckService (aggregation itself is Terminus's job, not this controller's)", () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      redis.isHealthy.mockImplementation(() => {
        throw new Error("redis-ratelimit is not available");
      });

      expect(controller.checkHealth()).rejects.toThrow(
        "redis-ratelimit is not available"
      );
    });
  });

  describe("readyz", () => {
    it("delegates to HealthCheckService.check with only a database check", () => {
      health.check.mockReturnValue({
        status: "ok",
        checks: { database: { status: "up" } },
      });

      const result = controller.readyz();

      expect(health.check).toHaveBeenCalledWith(expect.any(Array));
      const checks = health.check.mock.calls[0]?.[0] as unknown[];
      expect(checks).toHaveLength(1);
      expect(result).toEqual({
        status: "ok",
        checks: { database: { status: "up" } },
      });
    });

    it("pings the database with a 5 second timeout, same as the full health check", () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      db.pingCheck.mockReturnValue({ database: { status: "up" } });

      controller.readyz();

      expect(db.pingCheck).toHaveBeenCalledWith("database", { timeout: 5000 });
    });

    it("does not check memory or the rate-limiter Redis connection", () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      db.pingCheck.mockReturnValue({ database: { status: "up" } });

      controller.readyz();

      expect(memory.checkHeap).not.toHaveBeenCalled();
      expect(redis.isHealthy).not.toHaveBeenCalled();
    });
  });

  describe("livez", () => {
    it("returns a static ok status without checking any dependency", () => {
      expect(controller.livez()).toEqual({ status: "ok" });
      expect(health.check).not.toHaveBeenCalled();
    });
  });
});
