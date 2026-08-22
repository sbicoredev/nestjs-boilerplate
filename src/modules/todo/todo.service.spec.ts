import "reflect-metadata";

import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { CacheService } from "~/core/cache/cache.service";

import { Todo } from "./entities/todo.entity";
import { TodoService } from "./todo.service";

describe("TodoService", () => {
  let service: TodoService;
  let todoRepository: {
    create: Mock;
    save: Mock;
    find: Mock;
    findOneBy: Mock;
    update: Mock;
    delete: Mock;
  };
  let cacheService: {
    get: Mock;
    set: Mock;
    del: Mock;
    wrap: Mock;
  };

  beforeEach(async () => {
    todoRepository = {
      create: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
      findOneBy: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    cacheService = {
      get: vi.fn(),
      set: vi.fn(),
      del: vi.fn(),
      wrap: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: getRepositoryToken(Todo), useValue: todoRepository },
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<TodoService>(TodoService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("creates a new entity with a generated id, isCompleted=false, and a createdAt timestamp", async () => {
      const created = {
        id: "generated-id",
        title: "Write tests",
        isCompleted: false,
        createdAt: new Date(),
      };
      todoRepository.create.mockReturnValue(created);
      todoRepository.save.mockResolvedValue(created);

      const result = await service.create({ title: "Write tests" });

      expect(todoRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Write tests",
          isCompleted: false,
          id: expect.any(String),
          createdAt: expect.any(Date),
        })
      );
      expect(todoRepository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it("generates a different id for each todo", async () => {
      todoRepository.create.mockImplementation((entity) => entity);
      todoRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity)
      );

      const first = await service.create({ title: "First" });
      const second = await service.create({ title: "Second" });

      expect(first.id).not.toBe(second.id);
    });

    it("invalidates the cached todo list, since a new row changes it", async () => {
      todoRepository.create.mockImplementation((entity) => entity);
      todoRepository.save.mockImplementation((entity) =>
        Promise.resolve(entity)
      );

      await service.create({ title: "Write tests" });

      expect(cacheService.del).toHaveBeenCalledWith({ key: "todoList" });
    });
  });

  describe("findAll", () => {
    it("returns every todo, wrapped through the cache", async () => {
      const todos = [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
      ];
      cacheService.wrap.mockImplementation((_params, cb: () => unknown) =>
        cb()
      );
      todoRepository.find.mockReturnValue(todos);

      const result = await service.findAll();

      expect(cacheService.wrap).toHaveBeenCalledWith(
        { key: "todoList" },
        expect.any(Function)
      );
      expect(result).toBe(todos);
    });

    it("returns an empty array when there are no todos", async () => {
      cacheService.wrap.mockImplementation((_params, cb: () => unknown) =>
        cb()
      );
      todoRepository.find.mockReturnValue([]);

      expect(await service.findAll()).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("returns the cached todo without touching the repository, on a cache hit", async () => {
      const cached = { id: "abc", title: "Cached" };
      cacheService.get.mockResolvedValue(cached);

      const result = await service.findOne("abc");

      expect(cacheService.get).toHaveBeenCalledWith({
        key: "todoDetail",
        args: ["abc"],
      });
      expect(todoRepository.findOneBy).not.toHaveBeenCalled();
      expect(result).toBe(cached);
    });

    it("looks up the repository by id on a cache miss, and caches the result", async () => {
      cacheService.get.mockResolvedValue(null);
      const found = { id: "abc", title: "Found" };
      todoRepository.findOneBy.mockResolvedValue(found);

      const result = await service.findOne("abc");

      expect(todoRepository.findOneBy).toHaveBeenCalledWith({ id: "abc" });
      expect(cacheService.set).toHaveBeenCalledWith(
        { key: "todoDetail", args: ["abc"] },
        found
      );
      expect(result).toBe(found);
    });

    it("throws NotFoundException for a missing id, without caching the negative result", async () => {
      cacheService.get.mockResolvedValue(null);
      todoRepository.findOneBy.mockResolvedValue(null);

      await expect(service.findOne("missing-id")).rejects.toThrow(
        NotFoundException
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates only the fields present on the DTO by id", async () => {
      todoRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.update("abc", {
        title: "Updated title",
        isCompleted: true,
      });

      expect(todoRepository.update).toHaveBeenCalledWith(
        { id: "abc" },
        { title: "Updated title", isCompleted: true }
      );
      expect(result.affected).toBe(1);
    });

    it("invalidates both the list and detail cache entries on a successful update", async () => {
      todoRepository.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.update("abc", { title: "x" });

      expect(cacheService.del).toHaveBeenCalledWith({ key: "todoList" });
      expect(cacheService.del).toHaveBeenCalledWith({
        key: "todoDetail",
        args: ["abc"],
      });
    });

    it("throws NotFoundException for a missing id, instead of silently reporting affected=0", async () => {
      todoRepository.update.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });

      await expect(
        service.update("missing-id", { title: "x" })
      ).rejects.toThrow(NotFoundException);
      expect(cacheService.del).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes the todo by id", async () => {
      todoRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.remove("abc");

      expect(todoRepository.delete).toHaveBeenCalledWith({ id: "abc" });
      expect(result.affected).toBe(1);
    });

    it("invalidates both the list and detail cache entries on a successful delete", async () => {
      todoRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove("abc");

      expect(cacheService.del).toHaveBeenCalledWith({ key: "todoList" });
      expect(cacheService.del).toHaveBeenCalledWith({
        key: "todoDetail",
        args: ["abc"],
      });
    });

    it("throws NotFoundException for a missing id, instead of silently reporting affected=0", async () => {
      todoRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove("missing-id")).rejects.toThrow(
        NotFoundException
      );
      expect(cacheService.del).not.toHaveBeenCalled();
    });
  });
});
