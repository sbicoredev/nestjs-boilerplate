import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateTodoDto {
  @ApiProperty({ example: "Create Task" })
  @IsNotEmpty()
  @IsString()
  title: string;
}
