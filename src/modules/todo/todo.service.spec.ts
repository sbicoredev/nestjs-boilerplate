import "reflect-metadata";

import { NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";

import { CacheService } from "~/core/cache/cache.service";

import { Todo } from "./entities/todo.entity";
import { TodoService } from "./todo.service";

describe("TodoService", () => {
  let service: TodoService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOneBy: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let cache: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    wrap: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOneBy: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      wrap: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoService,
        { provide: getRepositoryToken(Todo), useValue: repo },
        { provide: CacheService, useValue: cache },
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
      repo.create.mockReturnValue(created);
      repo.save.mockResolvedValue(created);

      const result = await service.create({ title: "Write tests" });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Write tests",
          isCompleted: false,
          id: expect.any(String),
          createdAt: expect.any(Date),
        })
      );
      expect(repo.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it("generates a different id for each todo", async () => {
      repo.create.mockImplementation((entity) => entity);
      repo.save.mockImplementation((entity) => Promise.resolve(entity));

      const first = await service.create({ title: "First" });
      const second = await service.create({ title: "Second" });

      expect(first.id).not.toBe(second.id);
    });

    it("invalidates the cached todo list, since a new row changes it", async () => {
      repo.create.mockImplementation((entity) => entity);
      repo.save.mockImplementation((entity) => Promise.resolve(entity));

      await service.create({ title: "Write tests" });

      expect(cache.del).toHaveBeenCalledWith({ key: "todoList" });
    });
  });

  describe("findAll", () => {
    it("returns every todo, wrapped through the cache", async () => {
      const todos = [
        { id: "1", title: "A" },
        { id: "2", title: "B" },
      ];
      cache.wrap.mockImplementation((_params, cb: () => unknown) => cb());
      repo.find.mockReturnValue(todos);

      const result = await service.findAll();

      expect(cache.wrap).toHaveBeenCalledWith(
        { key: "todoList" },
        expect.any(Function)
      );
      expect(result).toBe(todos);
    });

    it("returns an empty array when there are no todos", async () => {
      cache.wrap.mockImplementation((_params, cb: () => unknown) => cb());
      repo.find.mockReturnValue([]);

      expect(await service.findAll()).toEqual([]);
    });
  });

  describe("findOne", () => {
    it("returns the cached todo without touching the repository, on a cache hit", async () => {
      const cached = { id: "abc", title: "Cached" };
      cache.get.mockResolvedValue(cached);

      const result = await service.findOne("abc");

      expect(cache.get).toHaveBeenCalledWith({
        key: "todoDetail",
        args: ["abc"],
      });
      expect(repo.findOneBy).not.toHaveBeenCalled();
      expect(result).toBe(cached);
    });

    it("looks up the repository by id on a cache miss, and caches the result", async () => {
      cache.get.mockResolvedValue(null);
      const found = { id: "abc", title: "Found" };
      repo.findOneBy.mockResolvedValue(found);

      const result = await service.findOne("abc");

      expect(repo.findOneBy).toHaveBeenCalledWith({ id: "abc" });
      expect(cache.set).toHaveBeenCalledWith(
        { key: "todoDetail", args: ["abc"] },
        found
      );
      expect(result).toBe(found);
    });

    it("throws NotFoundException for a missing id, without caching the negative result", async () => {
      cache.get.mockResolvedValue(null);
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne("missing-id")).rejects.toThrow(
        NotFoundException
      );
      expect(cache.set).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("updates only the fields present on the DTO by id", async () => {
      repo.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      const result = await service.update("abc", {
        title: "Updated title",
        isCompleted: true,
      });

      expect(repo.update).toHaveBeenCalledWith(
        { id: "abc" },
        { title: "Updated title", isCompleted: true }
      );
      expect(result.affected).toBe(1);
    });

    it("invalidates both the list and detail cache entries on a successful update", async () => {
      repo.update.mockResolvedValue({
        affected: 1,
        raw: [],
        generatedMaps: [],
      });

      await service.update("abc", { title: "x" });

      expect(cache.del).toHaveBeenCalledWith({ key: "todoList" });
      expect(cache.del).toHaveBeenCalledWith({
        key: "todoDetail",
        args: ["abc"],
      });
    });

    it("throws NotFoundException for a missing id, instead of silently reporting affected=0", async () => {
      repo.update.mockResolvedValue({
        affected: 0,
        raw: [],
        generatedMaps: [],
      });

      await expect(
        service.update("missing-id", { title: "x" })
      ).rejects.toThrow(NotFoundException);
      expect(cache.del).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("deletes the todo by id", async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await service.remove("abc");

      expect(repo.delete).toHaveBeenCalledWith({ id: "abc" });
      expect(result.affected).toBe(1);
    });

    it("invalidates both the list and detail cache entries on a successful delete", async () => {
      repo.delete.mockResolvedValue({ affected: 1, raw: [] });

      await service.remove("abc");

      expect(cache.del).toHaveBeenCalledWith({ key: "todoList" });
      expect(cache.del).toHaveBeenCalledWith({
        key: "todoDetail",
        args: ["abc"],
      });
    });

    it("throws NotFoundException for a missing id, instead of silently reporting affected=0", async () => {
      repo.delete.mockResolvedValue({ affected: 0, raw: [] });

      await expect(service.remove("missing-id")).rejects.toThrow(
        NotFoundException
      );
      expect(cache.del).not.toHaveBeenCalled();
    });
  });
});
