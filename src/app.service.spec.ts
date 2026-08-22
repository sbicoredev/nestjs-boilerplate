import "reflect-metadata";

import type { I18nService } from "nestjs-i18n";
import { describe, expect, it, vi } from "vitest";

import { AppService } from "./app.service";
import type { HttpContext } from "./core/http-context/http-context";

describe("AppService", () => {
  it("returns the current request id and the localized ok message", () => {
    const i18n = { t: vi.fn().mockReturnValue("OK") } as unknown as I18nService;
    const httpContext = {
      getRequestId: vi
        .fn()
        .mockReturnValue("018f0000-0000-7000-8000-000000000000"),
    } as unknown as HttpContext;

    const service = new AppService(i18n, httpContext);
    const result = service.getOk();

    expect(result).toEqual({
      requestId: "018f0000-0000-7000-8000-000000000000",
      message: "OK",
    });
    expect(i18n.t).toHaveBeenCalledWith("app.ok");
  });
});
