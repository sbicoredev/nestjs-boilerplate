import "reflect-metadata";

import { ClsService } from "nestjs-cls";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { HttpContext } from "./http-context";

describe("NestHttpContext", () => {
  let clsService: { getId: Mock; get: Mock; set: Mock };
  let request: { id: string; res?: unknown };

  beforeEach(() => {
    clsService = {
      getId: vi.fn().mockReturnValue("abc123"),
      get: vi.fn(),
      set: vi.fn(),
    };
    request = { id: "abc123", res: { some: "response" } };
  });

  function build(): HttpContext {
    return new HttpContext(clsService as unknown as ClsService);
  }

  it("getRequestId delegates to ClsService.getId()", () => {
    const context = build();
    expect(context.getRequestId()).toBe("abc123");
    expect(clsService.getId).toHaveBeenCalledTimes(1);
  });
});
