import "reflect-metadata";

import { Test, TestingModule } from "@nestjs/testing";

import { TodoController } from "./todo.controller";
import { TodoService } from "./todo.service";

describe("TodoController", () => {
  let controller: TodoController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TodoController],
      providers: [{ provide: TodoService, useValue: service }],
    }).compile();

    controller = module.get<TodoController>(TodoController);
  });

  it("is defined", () => {
    expect(controller).toBeDefined();
  });

  it("create() delegates to TodoService.create with the DTO", () => {
    const dto = { title: "New todo" };
    service.create.mockReturnValue({ id: "1", ...dto });

    const result = controller.create(dto);

    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: "1", ...dto });
  });

  it("findAll() delegates to TodoService.findAll with no arguments", () => {
    const todos = [{ id: "1" }, { id: "2" }];
    service.findAll.mockReturnValue(todos);

    const result = controller.findAll();

    expect(service.findAll).toHaveBeenCalledWith();
    expect(result).toBe(todos);
  });

  it("findOne() delegates to TodoService.findOne with the route param id", () => {
    service.findOne.mockReturnValue({ id: "42" });

    const result = controller.findOne("42");

    expect(service.findOne).toHaveBeenCalledWith("42");
    expect(result).toEqual({ id: "42" });
  });

  it("update() delegates to TodoService.update with the id and DTO", () => {
    const dto = { title: "Updated", isCompleted: true };
    service.update.mockReturnValue({ affected: 1 });

    const result = controller.update("42", dto);

    expect(service.update).toHaveBeenCalledWith("42", dto);
    expect(result).toEqual({ affected: 1 });
  });

  it("remove() delegates to TodoService.remove with the id", () => {
    service.remove.mockReturnValue({ affected: 1 });

    const result = controller.remove("42");

    expect(service.remove).toHaveBeenCalledWith("42");
    expect(result).toEqual({ affected: 1 });
  });
});
