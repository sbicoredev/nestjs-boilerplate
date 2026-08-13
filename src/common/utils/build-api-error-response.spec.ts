import "reflect-metadata";

import { HttpStatus, NotFoundException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import type { NestRequest } from "../types";
import { buildApiErrorResponse } from "./build-api-error-response";

describe("buildApiErrorResponse", () => {
  const req = { id: "req_abc123", url: "/api/todos" } as NestRequest;

  it("uses the HttpException's own status and message", () => {
    const { httpStatus, response } = buildApiErrorResponse(
      new NotFoundException("Todo not found"),
      req
    );

    expect(httpStatus).toBe(HttpStatus.NOT_FOUND);
    expect(response.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(response.message).toBe("Todo not found");
  });

  it("falls back to 500 and a generic message for a non-HttpException", () => {
    const { httpStatus, response } = buildApiErrorResponse(
      new Error("boom"),
      req
    );

    expect(httpStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.message).toBe("Internal server error");
  });

  it("falls back to 500 for a thrown non-Error value", () => {
    const { httpStatus } = buildApiErrorResponse("just a string", req);
    expect(httpStatus).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it("carries the request id and path through from the request", () => {
    const { response } = buildApiErrorResponse(new NotFoundException("x"), req);

    expect(response.requestId).toBe("req_abc123");
    expect(response.path).toBe("/api/todos");
  });

  it("includes a parseable ISO timestamp", () => {
    const { response } = buildApiErrorResponse(new NotFoundException("x"), req);

    expect(() => new Date(response.timestamp).toISOString()).not.toThrow();
  });

  it("leaves errors and context undefined by default", () => {
    const { response } = buildApiErrorResponse(new NotFoundException("x"), req);

    expect(response.errors).toBeUndefined();
    expect(response.context).toBeUndefined();
  });
});
