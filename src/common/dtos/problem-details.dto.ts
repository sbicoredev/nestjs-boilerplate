import { ApiProperty } from "@nestjs/swagger";

/**
 * RFC 9457 "Problem Details for HTTP APIs" response body. Every error
 * response in this app has this shape and is served as
 * `application/problem+json` (see `PROBLEM_DETAILS_CONTENT_TYPE`).
 *
 * `type`, `title`, `status`, `detail`, and `instance` are the members the
 * RFC itself defines. Everything else below is an application-specific
 * extension member, which the RFC explicitly allows (§3.2).
 */
export class ProblemDetailsDto {
  @ApiProperty({
    description:
      "A URI reference identifying the problem type. `about:blank` (the default) means the problem has no more specific semantics than the HTTP status code itself; consumers should not auto-dereference this.",
    example: "urn:acme:catalog:product_not_found",
  })
  readonly type: string;

  @ApiProperty({
    description:
      "A short, human-readable summary of the problem type. Should be the same for every occurrence of the same `type`, except for localization.",
    example: "Product Not Found",
  })
  readonly title: string;

  @ApiProperty({
    description: "The HTTP status code for this occurrence of the problem.",
    example: 404,
  })
  readonly status: number;

  @ApiProperty({
    description:
      "A human-readable explanation specific to this occurrence of the problem.",
    example: 'Product with id "123" not found',
  })
  readonly detail: string;

  @ApiProperty({
    description: "A URI reference identifying this specific occurrence.",
    example: "/api/products/123",
  })
  readonly instance: string;

  @ApiProperty({
    description: "Extension member: custom error code for specific error.",
    example: "VALIDAITON_ERROR",
  })
  readonly code: string;

  @ApiProperty({
    description: "Extension member: this app's per-request correlation id.",
    example: "01a01ef4-f4c8-7031-b8e5-5becd1d31483",
  })
  readonly requestId: string;

  @ApiProperty({
    description: "Extension member: when this occurrence happened.",
    example: new Date().toISOString(),
  })
  readonly timestamp: string;

  @ApiProperty({
    description:
      "Extension member, present only when `type` is validation-failed: one entry per failed field constraint.",
    required: false,
    example: {
      name: ["Name must be a string"],
    },
  })
  readonly errors?: Record<string, string[]>;
}
