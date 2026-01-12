import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import { ApiErrorResponse } from "~/common/dtos/api-error-response.dto";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<NestRequest>();
    const res = ctx.getResponse<NestResponse>();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : "Internal server error";

    const responseBody = new ApiErrorResponse({
      timestamp: new Date().toISOString(),
      requestId: req.id,
      path: req.url,
      statusCode: httpStatus,
      message,
    });

    res.status(httpStatus).json(responseBody);
  }
}
