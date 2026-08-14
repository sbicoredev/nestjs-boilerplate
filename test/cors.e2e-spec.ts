import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./utils/bootstrap-app";

describe("CORS (e2e)", () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    // .env sets APP_CORS_ORIGINS=http://localhost:3000, which AppConfig
    // expands to include the www. variant automatically (see
    // docs/architecture.md's CORS origin resolution notes).
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it("reflects an allowed origin in Access-Control-Allow-Origin", async () => {
    const res = await request(server)
      .get("/livez")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
  });

  it("does not reflect a disallowed origin", async () => {
    const res = await request(server)
      .get("/livez")
      .set("Origin", "http://evil-attacker.example.com");

    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("responds to a CORS preflight (OPTIONS) request for an allowed origin", async () => {
    const res = await request(server)
      .options("/api/todos")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "POST");

    expect(res.status).toBeLessThan(400);
    expect(res.headers["access-control-allow-origin"]).toBe(
      "http://localhost:3000"
    );
  });

  it("allows credentials for an allowed origin", async () => {
    const res = await request(server)
      .get("/livez")
      .set("Origin", "http://localhost:3000");

    expect(res.headers["access-control-allow-credentials"]).toBe("true");
  });
});
