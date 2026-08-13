import "reflect-metadata";

import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { GlobalExceptionFilter } from "./global-exception.filter";

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let logger: { error: Mock };
  let jsonMock: Mock;
  let statusMock: Mock;
  let req: { path: string; url: string; id: string };

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
    req = { path: "/api/todos", url: "/api/todos", id: "req_abc123" };

    filter = new GlobalExceptionFilter(logger as unknown as Logger);
  });

  it("maps a NotFoundException to a 404 response with its own message", () => {
    filter.catch(new NotFoundException("Todo not found"), buildHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Todo not found",
        path: "/api/todos",
        requestId: "req_abc123",
      })
    );
  });

  it("maps an unrecognized error to a 500 with a generic message", () => {
    filter.catch(new Error("something exploded"), buildHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
      })
    );
  });

  it("maps a thrown non-Error value (e.g. a string) to a 500 as well", () => {
    filter.catch("just a string", buildHost());

    expect(statusMock).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it("includes an ISO timestamp in the response body", () => {
    filter.catch(new NotFoundException("x"), buildHost());

    const [[body]] = jsonMock.mock.calls;
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
  });

  it("logs the exception when the request path is not /favicon.ico", () => {
    filter.catch(new NotFoundException("x"), buildHost());
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("does not log noise for /favicon.ico requests", () => {
    req.path = "/favicon.ico";
    filter.catch(new NotFoundException("x"), buildHost());
    expect(logger.error).not.toHaveBeenCalled();
  });

  it("still returns a normal error response for /favicon.ico even though it isn't logged", () => {
    req.path = "/favicon.ico";
    filter.catch(new NotFoundException("x"), buildHost());
    expect(statusMock).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
  });
});
