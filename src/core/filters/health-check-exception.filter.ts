import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

import type { NestRequest, NestResponse } from "~/common/types";
import { buildApiErrorResponse } from "~/common/utils/build-api-error-response";

type TerminusHealthCheckResult = {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
};

/**
 * @nestjs/terminus's HealthCheckService.check() throws a plain
 * ServiceUnavailableException whose getResponse() is the full
 * { status, info, error, details } breakdown of which indicator failed and
 * why. Left to GlobalExceptionFilter's catch-all, that detail is discarded
 * in favor of a generic "Service Unavailable Exception" message — a caller
 * has no way to tell whether Postgres, Redis, or memory was the cause.
 *
 * This filter is deliberately scoped to ServiceUnavailableException (not a
 * Terminus-specific subclass, because Terminus doesn't throw one) and
 * defensively checks the response shape before treating it as a health
 * check result: some future feature may throw a plain
 * ServiceUnavailableException for an unrelated reason (e.g. maintenance
 * mode), and that should fall back to the exact same generic handling
 * GlobalExceptionFilter would have given it.
 */
@Catch(ServiceUnavailableException)
export class HealthCheckExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: ServiceUnavailableException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<NestRequest>();
    const res = ctx.getResponse<NestResponse>();

    const { httpStatus, response } = buildApiErrorResponse(exception, req);
    const healthResult = this.asTerminusResult(exception.getResponse());

    if (!healthResult) {
      if (req.path !== "/favicon.ico") {
        this.logger.error(exception);
      }
      res.status(httpStatus).json(response);
      return;
    }

    const failedIndicators = Object.keys(healthResult.error ?? {});
    this.logger.error(
      `Health check failed: ${failedIndicators.join(", ") || "unknown indicator"}`
    );

    res.status(httpStatus).json({
      ...response,
      context: {
        info: healthResult.info,
        error: healthResult.error,
        details: healthResult.details,
      },
    });
  }

  private asTerminusResult(
    body: unknown
  ): TerminusHealthCheckResult | undefined {
    if (typeof body !== "object" || body === null) {
      return;
    }

    const candidate = body as Partial<TerminusHealthCheckResult>;
    const hasIndicatorBreakdown =
      typeof candidate.info === "object" ||
      typeof candidate.error === "object" ||
      typeof candidate.details === "object";

    if (typeof candidate.status !== "string" || !hasIndicatorBreakdown) {
      return;
    }

    return candidate as TerminusHealthCheckResult;
  }
}
