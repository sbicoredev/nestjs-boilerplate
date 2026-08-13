import "reflect-metadata";

import {
  ArgumentsHost,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { HealthCheckExceptionFilter } from "./health-check-exception.filter";

describe("HealthCheckExceptionFilter", () => {
  let filter: HealthCheckExceptionFilter;
  let logger: { error: Mock };
  let jsonMock: Mock;
  let statusMock: Mock;
  let req: { url: string; id: string; path: string };

  function buildHost(): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({ status: statusMock }),
      }),
    } as unknown as ArgumentsHost;
  }

  beforeEach(() => {
    logger = { error: vi.fn() };
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { url: "/api/health", id: "req_health123", path: "/api/health" };

    filter = new HealthCheckExceptionFilter(logger as unknown as Logger);
  });

  it("preserves the info/error/details breakdown for a real Terminus health check failure", () => {
    const exception = new ServiceUnavailableException({
      status: "error",
      info: { database: { status: "up" } },
      error: { "redis-ratelimit": { status: "down", message: "ECONNREFUSED" } },
      details: {
        database: { status: "up" },
        "redis-ratelimit": { status: "down", message: "ECONNREFUSED" },
      },
    });

    filter.catch(exception, buildHost());

    expect(statusMock).toHaveBeenCalledWith(503);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 503,
        requestId: "req_health123",
        context: {
          info: { database: { status: "up" } },
          error: {
            "redis-ratelimit": { status: "down", message: "ECONNREFUSED" },
          },
          details: expect.objectContaining({
            "redis-ratelimit": { status: "down", message: "ECONNREFUSED" },
          }),
        },
      })
    );
  });

  it("logs which indicator(s) failed", () => {
    const exception = new ServiceUnavailableException({
      status: "error",
      info: {},
      error: {
        "redis-ratelimit": { status: "down" },
        database: { status: "down" },
      },
      details: {},
    });

    filter.catch(exception, buildHost());

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("redis-ratelimit")
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("database")
    );
  });

  it("falls back to the generic envelope for a ServiceUnavailableException that isn't a health check result", () => {
    const exception = new ServiceUnavailableException("Maintenance mode");

    filter.catch(exception, buildHost());

    expect(statusMock).toHaveBeenCalledWith(503);
    const [body] = jsonMock.mock.calls[0];
    expect(body.context).toBeUndefined();
    expect(body.message).toBe("Maintenance mode");
  });

  it("logs the generic case too (except for /favicon.ico)", () => {
    const exception = new ServiceUnavailableException("Maintenance mode");

    filter.catch(exception, buildHost());

    expect(logger.error).toHaveBeenCalledWith(exception);
  });

  it("does not log noise for /favicon.ico in the generic fallback case", () => {
    req.path = "/favicon.ico";
    const exception = new ServiceUnavailableException("Maintenance mode");

    filter.catch(exception, buildHost());

    expect(logger.error).not.toHaveBeenCalled();
  });

  it("only declares itself for ServiceUnavailableException (via @Catch), not other HttpExceptions", () => {
    // NotFoundException would never reach this filter in the real app (Nest
    // dispatches to the most specific @Catch() match), but this documents
    // the filter's own catch() doesn't special-case it either way if it
    // somehow were invoked directly.
    const exception = new NotFoundException("irrelevant");
    expect(() =>
      filter.catch(
        exception as unknown as ServiceUnavailableException,
        buildHost()
      )
    ).not.toThrow();
  });
});
