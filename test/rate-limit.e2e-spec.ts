import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./utils/bootstrap-app";

/**
 * This suite intentionally sets its own tight RATE_LIMIT_MAX/TTL via
 * process.env before compiling its own app instance, rather than relying
 * on whatever the shared `.env` sets (which is deliberately generous — see
 * AGENTS.md — so the rest of the e2e suite isn't accidentally throttled).
 * Because `pnpm run test:e2e` runs with --runInBand (all e2e files share
 * one process), these env vars are carefully restored in afterAll so they
 * don't leak into any file that runs after this one.
 *
 * It also pins every request to a dedicated fake client IP via
 * X-Forwarded-For (honored because APP_TRUST_PROXY trusts loopback, and
 * supertest's in-process requests originate from loopback). The
 * Redis-backed throttler storage keys its counters by (tracker=IP, route),
 * durably, independent of which app instance or configured limit is doing
 * the checking — without a dedicated IP, this suite's hits to /livez
 * and /health would collide with every other e2e file's hits to those
 * same routes from the default request IP, in either direction (this
 * suite getting silently pre-throttled by others' traffic, or this
 * suite's low limit/blockDuration blocking *other* files' later requests
 * to the same route for the rest of the block window).
 */
describe("Rate limiting (e2e)", () => {
  const FAKE_CLIENT_IP = "203.0.113.55";

  let app: INestApplication<App>;
  let server: App;
  const originalEnv = {
    RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
    RATE_LIMIT_TTL: process.env.RATE_LIMIT_TTL,
    RATE_LIMIT_BLOCK_DURATION: process.env.RATE_LIMIT_BLOCK_DURATION,
  };

  function get(path: string) {
    return request(server).get(path).set("X-Forwarded-For", FAKE_CLIENT_IP);
  }

  beforeAll(async () => {
    process.env.RATE_LIMIT_ENABLED = "true";
    process.env.RATE_LIMIT_MAX = "3";
    process.env.RATE_LIMIT_TTL = "10";
    process.env.RATE_LIMIT_BLOCK_DURATION = "10";

    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("allows requests up to the configured limit", async () => {
    // /livez does no database/Redis work of its own, keeping this test
    // focused purely on throttling rather than any other endpoint's logic.
    // These three requests are deliberately sequential (not Promise.all) —
    // parallel requests would race against the Redis-backed counter and
    // could all land before any of them observes the incremented count.
    await get("/livez").expect(200);
    await get("/livez").expect(200);
    await get("/livez").expect(200);
  });

  it("returns 429 once the limit is exceeded within the window", async () => {
    const res = await get("/livez");
    expect(res.status).toBe(429);
  });

  it("includes standard rate-limit headers on responses", async () => {
    // A fresh path avoids the CacheInterceptor serving a cached response
    // from an earlier test in this describe block, and lets us inspect the
    // throttler's own response headers on a fresh count for this route.
    const res = await get("/health?probe=headers-check");

    expect(res.headers).toEqual(
      expect.objectContaining({
        "x-ratelimit-limit": expect.any(String),
      })
    );
  });
});
