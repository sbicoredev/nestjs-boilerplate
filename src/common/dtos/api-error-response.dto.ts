import { ApiProperty } from "@nestjs/swagger";

export class ApiErrorResponse {
  @ApiProperty({ example: new Date().toISOString() })
  readonly timestamp: string;

  @ApiProperty({ example: "iHGbz6QBaJxWI2eCaVp6R" })
  readonly requestId: string;

  @ApiProperty({ example: "/api/sign-in" })
  readonly path: string;

  @ApiProperty({ example: 404 })
  readonly statusCode: number;

  @ApiProperty({ example: "User Not found" })
  readonly message: string;

  @ApiProperty({
    example: { field: ["error"] },
    nullable: true,
    required: false,
  })
  readonly errors?: Record<string, string[]>;

  constructor(body: ApiErrorResponse) {
    this.timestamp = body.timestamp;
    this.requestId = body.requestId;
    this.path = body.path;
    this.statusCode = body.statusCode;
    this.message = body.message;
    this.errors = body.errors;
  }
}
