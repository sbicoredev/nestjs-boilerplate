import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { ApiCommonErrors } from "~/common/decorators/api-common-errors.decorator.js";
import { SkipCache } from "~/common/decorators/skip-cache.decorator.js";

import { CreateTodoDto } from "./dto/create-todo.dto.js";
import { UpdateTodoDto } from "./dto/update-todo.dto.js";
import { TodoService } from "./todo.service.js";

@ApiTags("todos")
@ApiCommonErrors()
@Controller("todos")
@SkipCache()
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Post()
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todoService.create(createTodoDto);
  }

  @Get()
  findAll() {
    return this.todoService.findAll();
  }

  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.todoService.findOne(id);
  }

  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateTodoDto: UpdateTodoDto
  ) {
    return this.todoService.update(id, updateTodoDto);
  }

  @Delete(":id")
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.todoService.remove(id);
  }
}
