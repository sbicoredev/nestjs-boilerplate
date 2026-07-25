import { HttpException, HttpStatus } from "@nestjs/common";

import { ApiErrorResponse } from "~/common/dtos/api-error-response.dto";

import type { NestRequest } from "../types";

/**
 * Builds the standard error envelope (status/message/timestamp/request id/
 * path) for any thrown value. Shared by every exception filter so they stay
 * consistent by construction rather than by convention — a filter that
 * needs to add exception-specific detail (e.g. HealthCheckExceptionFilter)
 * calls this first and layers its own fields on top of the result.
 */
export function buildApiErrorResponse(
  exception: unknown,
  req: NestRequest
): { httpStatus: number; response: ApiErrorResponse } {
  const httpStatus =
    exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

  const message =
    exception instanceof HttpException
      ? exception.message
      : "Internal server error";

  const response = new ApiErrorResponse({
    timestamp: new Date().toISOString(),
    requestId: req.id,
    path: req.url,
    statusCode: httpStatus,
    message,
  });

  return { httpStatus, response };
}
