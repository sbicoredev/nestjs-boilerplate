import "reflect-metadata";

import { Reflector } from "@nestjs/core";

import { SKIP_CACHE_METADATA, SkipCache } from "./skip-cache.decorator";

describe("SkipCache", () => {
  it("sets the skip_cache metadata to true on a decorated class", () => {
    @SkipCache()
    class SampleController {}

    const reflector = new Reflector();
    expect(reflector.get(SKIP_CACHE_METADATA, SampleController)).toBe(true);
  });

  it("sets the skip_cache metadata to true on a decorated method", () => {
    class SampleController {
      @SkipCache()
      handler() {
        return "ok";
      }
    }

    const reflector = new Reflector();
    expect(
      reflector.get(SKIP_CACHE_METADATA, SampleController.prototype.handler)
    ).toBe(true);
  });

  it("leaves an undecorated class without the metadata", () => {
    class PlainController {}

    const reflector = new Reflector();
    expect(reflector.get(SKIP_CACHE_METADATA, PlainController)).toBeUndefined();
  });
});
