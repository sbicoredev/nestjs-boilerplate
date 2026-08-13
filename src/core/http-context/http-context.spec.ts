import "reflect-metadata";

import { ClsService } from "nestjs-cls";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { NestHttpContext } from "./http-context";

describe("NestHttpContext", () => {
  let cls: { getId: Mock; get: Mock; set: Mock };
  let request: { id: string; res?: unknown };

  beforeEach(() => {
    cls = {
      getId: vi.fn().mockReturnValue("req_abc123"),
      get: vi.fn(),
      set: vi.fn(),
    };
    request = { id: "req_abc123", res: { some: "response" } };
  });

  function build(): NestHttpContext {
    return new NestHttpContext(request as never, cls as unknown as ClsService);
  }

  it("getRequest returns the injected request object", () => {
    const context = build();
    expect(context.getRequest()).toBe(request);
  });

  it("getResponse returns the request's `res` property", () => {
    const context = build();
    expect(context.getResponse()).toBe(request.res);
  });

  it("getResponse returns undefined when the request has no `res` yet", () => {
    request.res = undefined;
    const context = build();
    expect(context.getResponse()).toBeUndefined();
  });

  it("getRequestId delegates to ClsService.getId()", () => {
    const context = build();
    expect(context.getRequestId()).toBe("req_abc123");
    expect(cls.getId).toHaveBeenCalledTimes(1);
  });
});
