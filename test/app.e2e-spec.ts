import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./utils/bootstrap-app";

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/api (GET) returns the translated Ok message and a request id", () =>
    request(app.getHttpServer())
      .get("/api")
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual(
          expect.objectContaining({
            message: "Ok!",
            requestId: expect.any(String),
          })
        );
      }));

  it("/api (GET) echoes back a caller-supplied x-request-id header as uuid", () =>
    // A distinct query string avoids hitting the same cache key as the
    // previous test — the global CacheInterceptor caches GET responses by
    // full URL (see docs/progress-tracker.md's follow-ups backlog), so an
    // identical URL here would just replay the first test's cached body.
    request(app.getHttpServer())
      .get("/api?probe=echo-request-id")
      .set("x-request-id", "018f0000-0000-7000-8000-000000000000")
      .expect(200)
      .expect((res) => {
        expect(res.body.requestId).toBe("018f0000-0000-7000-8000-000000000000");
      }));
});
