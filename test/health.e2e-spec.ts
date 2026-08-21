import { INestApplication } from "@nestjs/common";
import { HealthCheckError, MemoryHealthIndicator } from "@nestjs/terminus";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./utils/bootstrap-app";

const ISO_TIMESTAMP_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

describe("HealthController (e2e)", () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    // MemoryHealthIndicator is overridden to always report "up" so this
    // suite tests what it claims to test — Postgres/Redis reachability —
    // without being conflated with real Node process heap pressure. The
    // 150MB checkHeap() threshold genuinely trips under Jest/ts-jest's own
    // overhead in this environment often enough to make the real indicator
    // unusable as a stable test signal here.
    app = await createTestApp((builder) =>
      builder.overrideProvider(MemoryHealthIndicator).useValue({
        checkHeap: (key: string) => ({ [key]: { status: "up" } }),
        checkRSS: (key: string) => ({ [key]: { status: "up" } }),
      })
    );
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("returns 200 with status ok when every indicator is up", async () => {
      const res = await request(server).get("/health").expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({
          status: "ok",
          checks: expect.objectContaining({
            memory_heap: expect.objectContaining({ status: "up" }),
            database: expect.objectContaining({ status: "up" }),
            "redis-ratelimit": expect.objectContaining({ status: "up" }),
          }),
        })
      );
    });

    it("reports all three indicators in `checks`", async () => {
      const res = await request(server).get("/health").expect(200);

      for (const key of ["memory_heap", "database", "redis-ratelimit"]) {
        expect(res.body.checks).toHaveProperty(key);
      }
    });
  });

  describe("GET /health when a dependency is down", () => {
    it("returns 503 as a Problem Details response with the per-indicator breakdown in `checks`", async () => {
      const failingApp = await createTestApp((builder) =>
        builder.overrideProvider(MemoryHealthIndicator).useValue({
          checkHeap: () => {
            throw new HealthCheckError("Memory heap check failed", {
              memory_heap: { status: "down", message: "heap too high" },
            });
          },
          checkRSS: () => {
            throw new HealthCheckError("Memory rss check failed", {
              memory_rss: { status: "down", message: "rss too high" },
            });
          },
        })
      );
      const failingServer = failingApp.getHttpServer();

      const res = await request(failingServer).get("/health").expect(503);

      expect(res.headers["content-type"]).toContain("application/problem+json");
      expect(res.body).toEqual(
        expect.objectContaining({
          type: "about:blank",
          title: "Service Unavailable",
          status: 503,
          instance: "/health",
          code: "INTERNAL_ERROR",
          timestamp: expect.stringMatching(ISO_TIMESTAMP_REGEX),
          checks: expect.objectContaining({
            memory_heap: expect.objectContaining({ status: "down" }),
            memory_rss: expect.objectContaining({ status: "down" }),
          }),
        })
      );

      await failingApp.close();
    });
  });

  describe("GET /readyz", () => {
    it("returns 200 with status ok when the database is reachable", async () => {
      const res = await request(server).get("/readyz").expect(200);
      expect(res.body).toEqual(expect.objectContaining({ status: "ok" }));
    });
  });

  describe("GET /livez", () => {
    it("returns a static ok status without checking any dependency", async () => {
      const res = await request(server).get("/livez").expect(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });
});
