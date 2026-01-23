import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CreateTodoDto } from "./dto/create-todo.dto";
import { UpdateTodoDto } from "./dto/update-todo.dto";
import { Todo } from "./entities/todo.entity";

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo) private readonly repo: Repository<Todo>
  ) {}

  async create(createTodoDto: CreateTodoDto) {
    const entity = this.repo.create({
      id: crypto.randomUUID(),
      title: createTodoDto.title,
      isCompleted: false,
      createdAt: new Date(),
    });
    return await this.repo.save(entity);
  }

  findAll() {
    return this.repo.find();
  }

  async findOne(id: string) {
    return await this.repo.findBy({ id });
  }

  async update(id: string, updateTodoDto: UpdateTodoDto) {
    return await this.repo.update(
      { id },
      { title: updateTodoDto.title, isCompleted: updateTodoDto.isCompleted }
    );
  }

  async remove(id: string) {
    return await this.repo.delete({ id });
  }
}
