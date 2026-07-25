import "reflect-metadata";

import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { CacheService } from "./cache.service";

describe("CacheService", () => {
  let service: CacheService;
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
    wrap: jest.Mock;
    ttl: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      wrap: jest.fn(),
      ttl: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue("nestjs-app") };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  it("is defined", () => {
    expect(service).toBeDefined();
  });

  describe("get", () => {
    it("builds the cache key from the app prefix and calls cacheManager.get", async () => {
      cacheManager.get.mockResolvedValue({ id: "todo-1" });

      const result = await service.get({ key: "todoDetail", args: ["todo-1"] });

      expect(configService.get).toHaveBeenCalledWith("app.prefix", {
        infer: true,
      });
      expect(cacheManager.get).toHaveBeenCalledWith("nestjs-app:todo:todo-1");
      expect(result).toEqual({ id: "todo-1" });
    });
  });

  describe("set", () => {
    it("stores the value under the constructed key and returns that key", async () => {
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.set(
        { key: "todoDetail", args: ["todo-2"] },
        { id: "todo-2" },
        { ttl: 5000 }
      );

      expect(cacheManager.set).toHaveBeenCalledWith(
        "nestjs-app:todo:todo-2",
        { id: "todo-2" },
        5000
      );
      expect(result).toEqual({ key: "nestjs-app:todo:todo-2" });
    });

    it("passes undefined ttl through when no options are given", async () => {
      await service.set({ key: "todoDetail", args: ["todo-3"] }, { id: 1 });

      expect(cacheManager.set).toHaveBeenCalledWith(
        "nestjs-app:todo:todo-3",
        { id: 1 },
        undefined
      );
    });
  });

  describe("del", () => {
    it("deletes the constructed key and returns it", async () => {
      const result = await service.del({ key: "todoDetail", args: ["todo-4"] });

      expect(cacheManager.del).toHaveBeenCalledWith("nestjs-app:todo:todo-4");
      expect(result).toEqual({ key: "nestjs-app:todo:todo-4" });
    });
  });

  describe("wrap", () => {
    it("delegates to cacheManager.wrap with the constructed key and callback", async () => {
      const callback = jest.fn().mockResolvedValue({ fresh: true });
      cacheManager.wrap.mockImplementation((_key: string, cb: () => unknown) =>
        cb()
      );

      const result = await service.wrap(
        { key: "todoDetail", args: ["todo-5"] },
        callback,
        { ttl: 1000 }
      );

      expect(cacheManager.wrap).toHaveBeenCalledWith(
        "nestjs-app:todo:todo-5",
        callback,
        1000
      );
      expect(result).toEqual({ fresh: true });
    });
  });

  describe("getTtl", () => {
    it("returns null when the raw ttl is -1 (key exists, no expiry)", async () => {
      cacheManager.ttl.mockResolvedValue(-1);
      const result = await service.getTtl({ key: "todoDetail", args: ["x"] });
      expect(result).toBeNull();
    });

    it("returns null when the raw ttl is -2 (key does not exist)", async () => {
      cacheManager.ttl.mockResolvedValue(-2);
      const result = await service.getTtl({ key: "todoDetail", args: ["x"] });
      expect(result).toBeNull();
    });

    it("returns the raw ttl value when it's a real, positive number", async () => {
      cacheManager.ttl.mockResolvedValue(4321);
      const result = await service.getTtl({ key: "todoDetail", args: ["x"] });
      expect(result).toBe(4321);
    });

    it("returns null (not -1/-2) when disableResponseFilter is left at its default", async () => {
      cacheManager.ttl.mockResolvedValue(-1);
      const result = await service.getTtl(
        { key: "todoDetail", args: ["x"] },
        { disableResponseFilter: false }
      );
      expect(result).toBeNull();
    });

    it("returns the raw -1 value when disableResponseFilter is true", async () => {
      cacheManager.ttl.mockResolvedValue(-1);
      const result = await service.getTtl(
        { key: "todoDetail", args: ["x"] },
        { disableResponseFilter: true }
      );
      expect(result).toBe(-1);
    });
  });
});
