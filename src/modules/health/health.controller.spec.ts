import "reflect-metadata";

import {
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from "@nestjs/terminus";
import { RedisHealthIndicator } from "@nestjs-redis/health-indicator";

import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let memory: { checkHeap: jest.Mock };
  let db: { pingCheck: jest.Mock };
  let redis: { isHealthy: jest.Mock };
  const redisRatelimitClient = { fakeClient: true };

  beforeEach(() => {
    health = { check: jest.fn() };
    memory = { checkHeap: jest.fn() };
    db = { pingCheck: jest.fn() };
    redis = { isHealthy: jest.fn() };

    controller = new HealthController(
      health as unknown as HealthCheckService,
      memory as unknown as MemoryHealthIndicator,
      db as unknown as TypeOrmHealthIndicator,
      redis as unknown as RedisHealthIndicator,
      redisRatelimitClient as never
    );
  });

  describe("checkHealth", () => {
    it("delegates to HealthCheckService.check with a list of indicator functions", () => {
      health.check.mockReturnValue({
        status: "ok",
        info: {},
        error: {},
        details: {},
      });

      const result = controller.checkHealth();

      expect(health.check).toHaveBeenCalledWith(expect.any(Array));
      const [[checks]] = health.check.mock.calls;
      expect(checks).toHaveLength(3);
      expect(result).toEqual({
        status: "ok",
        info: {},
        error: {},
        details: {},
      });
    });

    it("checks memory heap usage against a 150MB threshold", () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      memory.checkHeap.mockReturnValue({ memory_heap: { status: "up" } });

      controller.checkHealth();

      expect(memory.checkHeap).toHaveBeenCalledWith(
        "memory_heap",
        150 * 1024 * 1024
      );
    });

    it("pings the database with a 5 second timeout", () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      db.pingCheck.mockReturnValue({ database: { status: "up" } });

      controller.checkHealth();

      expect(db.pingCheck).toHaveBeenCalledWith("database", { timeout: 5000 });
    });

    it("checks Redis health using the rate-limiter connection", () => {
      health.check.mockImplementation((checks: Array<() => unknown>) =>
        checks.map((c) => c())
      );
      redis.isHealthy.mockReturnValue({ "redis-ratelimit": { status: "up" } });

      controller.checkHealth();

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

      expect(() => controller.checkHealth()).toThrow(
        "redis-ratelimit is not available"
      );
    });
  });

  describe("readyz", () => {
    it("delegates to HealthCheckService.check with only a database check", () => {
      health.check.mockReturnValue({
        status: "ok",
        info: { database: { status: "up" } },
        error: {},
        details: { database: { status: "up" } },
      });

      const result = controller.readyz();

      expect(health.check).toHaveBeenCalledWith(expect.any(Array));
      const [[checks]] = health.check.mock.calls;
      expect(checks).toHaveLength(1);
      expect(result).toEqual({
        status: "ok",
        info: { database: { status: "up" } },
        error: {},
        details: { database: { status: "up" } },
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
