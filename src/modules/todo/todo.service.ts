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
    @InjectRepository(Todo) private readonly todoRepository: Repository<Todo>,
    private readonly cacheService: CacheService
  ) {}

  async create(createTodoDto: CreateTodoDto): Promise<Todo> {
    const newTodo = this.todoRepository.create({
      id: crypto.randomUUID(),
      title: createTodoDto.title,
      isCompleted: false,
      createdAt: new Date(),
    });
    const savedTodo = await this.todoRepository.save(newTodo);

    // A new row changes what the list response should contain.
    await this.cacheService.del({ key: "todoList" });

    return savedTodo;
  }

  findAll(): Promise<Todo[]> {
    // An empty list is a legitimate value to cache — unlike findOne below,
    // there's no "negative result becomes permanently sticky" risk here.
    return this.cacheService.wrap({ key: "todoList" }, () =>
      this.todoRepository.find()
    );
  }

  async findOne(id: string): Promise<Todo> {
    const cachedTodo = await this.cacheService.get<Todo>({
      key: "todoDetail",
      args: [id],
    });
    if (cachedTodo) {
      return cachedTodo;
    }

    const todo = await this.todoRepository.findOneBy({ id });
    if (!todo) {
      throw new NotFoundException(todoErrors.notFound(id));
    }

    await this.cacheService.set({ key: "todoDetail", args: [id] }, todo);
    return todo;
  }

  async update(id: string, updateTodoDto: UpdateTodoDto) {
    const updateResult = await this.todoRepository.update(
      { id },
      { title: updateTodoDto.title, isCompleted: updateTodoDto.isCompleted }
    );

    if (!updateResult.affected) {
      throw new NotFoundException(todoErrors.notFound(id));
    }

    await Promise.all([
      this.cacheService.del({ key: "todoList" }),
      this.cacheService.del({ key: "todoDetail", args: [id] }),
    ]);

    return updateResult;
  }

  async remove(id: string) {
    const deleteResult = await this.todoRepository.delete({ id });

    if (!deleteResult.affected) {
      throw new NotFoundException(todoErrors.notFound(id));
    }

    await Promise.all([
      this.cacheService.del({ key: "todoList" }),
      this.cacheService.del({ key: "todoDetail", args: [id] }),
    ]);

    return deleteResult;
  }
}
