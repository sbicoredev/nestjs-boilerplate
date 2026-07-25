import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ValidationError } from "class-validator";

import { ApiErrorResponse } from "~/common/dtos/api-error-response.dto";
import type { NestRequest, NestResponse } from "~/common/types";

@Catch(UnprocessableEntityException)
export class UnprocessableEntityExceptionFilter implements ExceptionFilter {
  catch(exception: UnprocessableEntityException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<NestRequest>();
    const res = ctx.getResponse<NestResponse>();

    let errors: Record<string, string[]> = {};

    const errRes = exception.getResponse();
    if (
      errRes instanceof Object &&
      "errors" in errRes &&
      Array.isArray(errRes.errors) &&
      errRes.errors[0] instanceof ValidationError
    ) {
      const err = errRes.errors as ValidationError[];
      errors = err.reduce(
        (acc, curr) => {
          acc[curr.property] = Object.values(curr.constraints ?? []).map(
            (i) => i
          );
          return acc;
        },
        {} as Record<string, string[]>
      );
    }

    const response = new ApiErrorResponse({
      timestamp: new Date().toISOString(),
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      path: req.url,
      message: "Validation failed!",
      errors,
      requestId: req.id,
    });

    res.status(HttpStatus.UNPROCESSABLE_ENTITY).json(response);
  }
}
