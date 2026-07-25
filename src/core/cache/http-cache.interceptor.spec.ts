import "reflect-metadata";

import { ExecutionContext } from "@nestjs/common";
import { HttpAdapterHost, Reflector } from "@nestjs/core";

import { HttpCacheInterceptor } from "./http-cache.interceptor";

describe("HttpCacheInterceptor", () => {
  let reflector: { get: jest.Mock };
  let interceptor: HttpCacheInterceptor;
  let context: ExecutionContext;

  const handlerRef = {};
  const classRef = {};

  beforeEach(() => {
    reflector = { get: jest.fn() };
    interceptor = new HttpCacheInterceptor(
      {} as never,
      reflector as unknown as Reflector
    );
    // The base CacheInterceptor's httpAdapterHost is @Optional() and only
    // needed by the super.trackBy() fallback path.
    (
      interceptor as unknown as { httpAdapterHost: HttpAdapterHost }
    ).httpAdapterHost = {
      httpAdapter: {
        getRequestMethod: () => "GET",
        getRequestUrl: (req: { url: string }) => req.url,
      },
    } as unknown as HttpAdapterHost;

    context = {
      getHandler: () => handlerRef,
      getClass: () => classRef,
      getArgByIndex: () => ({ method: "GET", url: "/api/todos" }),
      switchToHttp: () => ({
        getRequest: () => ({ method: "GET", url: "/api/todos" }),
      }),
    } as unknown as ExecutionContext;
  });

  function trackBy() {
    return (
      interceptor as unknown as {
        trackBy: (ctx: ExecutionContext) => unknown;
      }
    ).trackBy(context);
  }

  it("returns undefined (skips caching) when @SkipCache() is set on the handler", () => {
    reflector.get.mockImplementation((_key: string, target: unknown) =>
      target === context.getHandler() ? true : undefined
    );

    expect(trackBy()).toBeUndefined();
  });

  it("returns undefined (skips caching) when @SkipCache() is set on the class", () => {
    reflector.get.mockImplementation((_key: string, target: unknown) =>
      target === context.getClass() ? true : undefined
    );

    expect(trackBy()).toBeUndefined();
  });

  it("checks the handler before falling back to the class", () => {
    reflector.get.mockReturnValueOnce(undefined).mockReturnValueOnce(true);

    trackBy();

    expect(reflector.get).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      context.getHandler()
    );
    expect(reflector.get).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      context.getClass()
    );
  });

  it("falls back to the default URL-based key when @SkipCache() isn't set anywhere", () => {
    reflector.get.mockReturnValue(undefined);

    expect(trackBy()).toBe("/api/todos");
  });
});
