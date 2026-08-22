import "reflect-metadata";

import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { GlobalExceptionFilter } from "./global-exception.filter";

/**
 * `catch()` is where every unhandled error in the app ends up, so these
 * tests exercise it directly (rather than the private `to*` helpers) to
 * match what a real request actually receives on the wire — status code,
 * headers, and the exact Problem Details body shape.
 */
describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let logger: { error: Mock };
  let httpAdapter: {
    getRequestUrl: Mock;
    setHeader: Mock;
    reply: Mock;
  };
  let host: ArgumentsHost;

  beforeEach(() => {
    logger = { error: vi.fn() };
    httpAdapter = {
      getRequestUrl: vi.fn().mockReturnValue("/api/todos/123"),
      setHeader: vi.fn(),
      reply: vi.fn(),
    };

    const httpAdapterHost = {
      httpAdapter,
    } as unknown as HttpAdapterHost;

    filter = new GlobalExceptionFilter(
      logger as unknown as Logger,
      httpAdapterHost
    );

    host = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => ({ id: "018f0000-0000-7000-8000-000000000000" }),
        getResponse: () => ({}),
      }),
    } as unknown as ArgumentsHost;
  });

  it("sets the Problem Details content type on every response", () => {
    filter.catch(new BadRequestException("bad input"), host);

    expect(httpAdapter.setHeader).toHaveBeenCalledWith(
      {},
      "Content-Type",
      "application/problem+json"
    );
  });

  it("maps a generic HttpException to a status-derived title and HTTP_ERROR code", () => {
    filter.catch(new BadRequestException("bad input"), host);

    const [, body, status] = httpAdapter.reply.mock.calls[0] ?? [];
    expect(status).toBe(400);
    expect(body).toEqual(
      expect.objectContaining({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "bad input",
        instance: "/api/todos/123",
        code: "HTTP_ERROR",
        requestId: "018f0000-0000-7000-8000-000000000000",
      })
    );
    expect(body.timestamp).toEqual(expect.any(String));
  });

  it("derives a urn:problem type and title from a domain-error code carried on an HttpException", () => {
    const domainError = {
      code: "todo.not_found",
      message: "Todo with id abc was not found",
      metadata: { id: "abc" },
    };

    filter.catch(new NotFoundException(domainError), host);

    const [, body, status] = httpAdapter.reply.mock.calls[0] ?? [];
    expect(status).toBe(404);
    expect(body).toEqual(
      expect.objectContaining({
        type: "urn:problem:todo:not-found",
        title: "Not Found",
        status: 404,
        detail: "Todo with id abc was not found",
        code: "todo.not_found",
      })
    );
  });

  it("maps UnprocessableEntityException to VALIDATION_ERROR with per-field errors flattened onto the body", () => {
    const validationErrors = [
      {
        property: "title",
        constraints: { isNotEmpty: "title should not be empty" },
      },
    ];

    filter.catch(new UnprocessableEntityException(validationErrors), host);

    const [, body, status] = httpAdapter.reply.mock.calls[0] ?? [];
    expect(status).toBe(422);
    expect(body).toEqual(
      expect.objectContaining({
        title: "Validation Failed",
        status: 422,
        code: "VALIDATION_ERROR",
        detail: "One or more fields failed validation.",
      })
    );
    expect(body.errors).toEqual({
      title: ["title should not be empty"],
    });
  });

  it("maps ServiceUnavailableException to INTERNAL_ERROR and surfaces the per-indicator breakdown, and logs it", () => {
    const healthResult = {
      status: "error",
      error: { database: { status: "down" } },
      details: { database: { status: "down" } },
    };

    filter.catch(new ServiceUnavailableException(healthResult), host);

    const [, body, status] = httpAdapter.reply.mock.calls[0] ?? [];
    expect(status).toBe(503);
    expect(body).toEqual(
      expect.objectContaining({
        type: "about:blank",
        title: "Service Unavailable",
        status: 503,
        code: "INTERNAL_ERROR",
      })
    );
    expect(body.checks).toEqual(healthResult.details);
    expect(logger.error).toHaveBeenCalled();
  });

  it("maps a non-HttpException (unexpected) error to a generic 500 without leaking its message", () => {
    filter.catch(new Error("secret internal detail"), host);

    const [, body, status] = httpAdapter.reply.mock.calls[0] ?? [];
    expect(status).toBe(500);
    expect(body).toEqual(
      expect.objectContaining({
        type: "about:blank",
        title: "Internal Server Error",
        status: 500,
        code: "INTERNAL_ERROR",
        detail: "An unexpected error occured.",
      })
    );
    expect(JSON.stringify(body)).not.toContain("secret internal detail");
  });

  it("logs and skips reply entirely for a non-HTTP execution context (e.g. an RPC/WS host)", () => {
    const nonHttpHost = {
      getType: () => "rpc",
    } as unknown as ArgumentsHost;

    filter.catch(new Error("boom"), nonHttpHost);

    expect(logger.error).toHaveBeenCalledWith(
      "Unhandled non-HTTP exception",
      expect.any(Error)
    );
    expect(httpAdapter.reply).not.toHaveBeenCalled();
  });
});
