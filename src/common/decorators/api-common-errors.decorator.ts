import { applyDecorators } from "@nestjs/common";
import { ApiResponse } from "@nestjs/swagger";

import { ProblemDetailsDto } from "../dtos/problem-details.dto";

export function ApiCommonErrors() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      type: ProblemDetailsDto,
      description: "Bad Request",
    }),
    ApiResponse({
      status: 404,
      type: ProblemDetailsDto,
      description: "Not Found",
    })
  );
}
