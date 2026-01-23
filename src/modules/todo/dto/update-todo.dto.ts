import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

import { CreateTodoDto } from "./create-todo.dto";

export class UpdateTodoDto extends PartialType(CreateTodoDto) {
  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}
