import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { CacheService } from "~/core/cache/cache.service";

import { CreateTodoDto } from "./dto/create-todo.dto";
import { UpdateTodoDto } from "./dto/update-todo.dto";
import { Todo } from "./entities/todo.entity";
import { todoErrors } from "./todo-errors";

@Injectable()
export class TodoService {
  constructor(
    @InjectRepository(Todo) private readonly repo: Repository<Todo>,
    private readonly cache: CacheService
  ) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    const entity = this.repo.create({
      id: crypto.randomUUID(),
      title: createTodoDto.title,
      isCompleted: false,
      createdAt: new Date(),
    });
    const saved = await this.repo.save(entity);

    // A new row changes what the list response should contain.
    await this.cache.del({ key: "todoList" });

    return saved;
  }

  findAll(): Promise<Todo[]> {
    // An empty list is a legitimate value to cache — unlike findOne below,
    // there's no "negative result becomes permanently sticky" risk here.
    return this.cache.wrap({ key: "todoList" }, () => this.repo.find());
  }

  async findOne(id: string): Promise<Todo> {
    const cached = await this.cache.get<Todo>({
      key: "todoDetail",
      args: [id],
    });
    if (cached) {
      return cached;
    }

    const todo = await this.repo.findOneBy({ id });
    if (!todo) {
      throw new NotFoundException(todoErrors.notFound(id));
    }

    await this.cache.set({ key: "todoDetail", args: [id] }, todo);
    return todo;
  }

  async update(id: string, updateTodoDto: UpdateTodoDto) {
    const result = await this.repo.update(
      { id },
      { title: updateTodoDto.title, isCompleted: updateTodoDto.isCompleted }
    );

    if (!result.affected) {
      throw new NotFoundException(todoErrors.notFound(id));
    }

    await Promise.all([
      this.cache.del({ key: "todoList" }),
      this.cache.del({ key: "todoDetail", args: [id] }),
    ]);

    return result;
  }

  async remove(id: string) {
    const result = await this.repo.delete({ id });

    if (!result.affected) {
      throw new NotFoundException(todoErrors.notFound(id));
    }

    await Promise.all([
      this.cache.del({ key: "todoList" }),
      this.cache.del({ key: "todoDetail", args: [id] }),
    ]);

    return result;
  }
}
