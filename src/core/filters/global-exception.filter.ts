import { STATUS_CODES } from "node:http";

import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";

import type { ProblemDetails } from "~/common/error/problem-details";
import type { NestRequest, NestResponse } from "~/common/types";
import { formatValidationErrors } from "~/common/utils/format-validation-errors";
import { snakeToTitleCase } from "~/common/utils/string-helper";

type TerminusHealthCheckResult = {
  status: string;
  info?: Record<string, unknown>;
  error?: Record<string, unknown>;
  details?: Record<string, unknown>;
};

const PROBLEM_DETAILS_CONTENT_TYPE = "application/problem+json";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly problemTypeBase = "urn:problem";
  constructor(
    private readonly logger: Logger,
    private readonly httpAdapterHost: HttpAdapterHost
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== "http") {
      this.logger.error("Unhandled non-HTTP exception", exception);
      return;
    }
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<NestRequest>();
    const res = ctx.getResponse<NestResponse>();
    const reqUrl = httpAdapter.getRequestUrl(req);

    const { extensions, ...problem } = this.toProblemDetails(exception, reqUrl);
    const problemDetails = {
      ...problem,
      timestamp: new Date().toISOString(),
      requestId: req.id,
      ...(extensions || {}),
    };

    httpAdapter.setHeader(res, "Content-Type", PROBLEM_DETAILS_CONTENT_TYPE);
    httpAdapter.reply(res, problemDetails, problemDetails.status);
  }

  private toProblemDetails(
    exception: unknown,
    pathname: string
  ): ProblemDetails {
    if (exception instanceof ServiceUnavailableException) {
      return this.fromServiceUnavailableException(exception, pathname);
    }
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, pathname);
    }
    return this.fromUnknown(exception, pathname);
  }

  /** Anything Nest itself throws (guards, pipes we didn't customize, 404 route, etc.) */
  private fromHttpException(
    exception: HttpException,
    instance: string
  ): ProblemDetails {
    const response = exception.getResponse();
    const status = exception.getStatus();
    const message = exception.message;

    let type = "about:blank";
    let title = STATUS_CODES[status] ?? "Bad Request";
    let code = "HTTP_ERROR";

    if (typeof response === "object") {
      const err = response as Record<string, unknown>;
      if (typeof err.code === "string") {
        code = err.code;
        type = this.toProblemTypeUrn(code);
        title = code.includes(".")
          ? snakeToTitleCase(code.split(".")[1] ?? title)
          : title;
      }
    }

    if (exception instanceof UnprocessableEntityException) {
      const errors = (response as Record<string, unknown>).message as [];
      return {
        type,
        title: "Validation Failed",
        status,
        detail: "One or more fields failed validation.",
        instance,
        code: "VALIDATION_ERROR",
        extensions: {
          errors: formatValidationErrors(errors),
        },
      };
    }

    return { type, title, status, detail: message, instance, code };
  }

  private fromServiceUnavailableException(
    exception: ServiceUnavailableException,
    instance: string
  ): ProblemDetails {
    const healthResult = this.asTerminusResult(exception.getResponse());

    this.logger.error(
      `Health check failed: ${Object.keys(healthResult?.error ?? {}).join(", ") || "unknown indicator"}`,
      healthResult?.details
    );

    return {
      type: "about:blank",
      title: "Service Unavailable",
      status: HttpStatus.SERVICE_UNAVAILABLE,
      detail:
        "One or more critical infrastructure dependencies failed the readiness check.",
      instance,
      code: "INTERNAL_ERROR",
      extensions: {
        checks: healthResult?.details,
      },
    };
  }

  private fromUnknown(exception: unknown, instance: string): ProblemDetails {
    return {
      type: "about:blank",
      title: "Internal Server Error",
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: "An unexpected error occured.",
      instance,
      code: "INTERNAL_ERROR",
    };
  }

  private asTerminusResult(body: unknown) {
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

  private toProblemTypeUrn(code: string): string {
    // catalog.product_not_found -> urn:problem:catalog:product-not-found
    return `${this.problemTypeBase}:${code.replace(/\./g, ":").replace(/_/g, "-")}`;
  }
}
