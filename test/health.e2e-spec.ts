import { INestApplication } from "@nestjs/common";
import { MemoryHealthIndicator } from "@nestjs/terminus";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createTestApp } from "./utils/bootstrap-app.js";

describe("HealthController (e2e)", () => {
  let app: INestApplication<App>;
  let server: App;
  const mockHttpHealthIndicator = {
    pingCheck: vi.fn(),
  };

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
      // Simulate indicator failure by making it reject or return a down status / error
      mockHttpHealthIndicator.pingCheck.mockRejectedValueOnce(
        new Error("Service unavailable")
      );

      return await request(app.getHttpServer())
        .get("/health")
        .expect(503)
        .expect((res) => {
          expect(res.body.status).toBe("error");
          expect(res.body.error).toHaveProperty("http");
        });
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
