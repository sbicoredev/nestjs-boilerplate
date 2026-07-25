import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class CreateTodoDto {
  @ApiProperty({ example: "Create Task", maxLength: 500 })
  @IsString()
  // Trimmed before validation so a whitespace-only title ("   ") correctly
  // fails @IsNotEmpty() instead of being accepted as a "blank" todo.
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsNotEmpty()
  @MaxLength(500)
  title: string;
}
