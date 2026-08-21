import { randomUUID } from "node:crypto";

import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestApp } from "./utils/bootstrap-app";

const UUID_REGEX = /^[0-9a-f-]{36}$/i;

/**
 * The `todo` module is the reference CRUD module new feature modules are
 * built from (see docs/adding-a-feature-module.md), so this suite doubles
 * as documentation of the expected request/response contract — including
 * the Problem Details error shape and the service-layer cache-invalidation
 * pattern (see SkipCache's docblock for why that's manual here rather than
 * handled by the HTTP cache interceptor).
 */
describe("TodoController (e2e)", () => {
  let app: INestApplication<App>;
  let server: App;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/todos", () => {
    it("creates a todo and returns 201 with the persisted shape", async () => {
      const res = await request(server)
        .post("/api/todos")
        .send({ title: "Write e2e tests" })
        .expect(201);

      expect(res.body).toEqual(
        expect.objectContaining({
          id: expect.stringMatching(UUID_REGEX),
          title: "Write e2e tests",
          isCompleted: false,
          createdAt: expect.any(String),
        })
      );

      // clean up so this suite leaves no state behind for other e2e files
      await request(server).delete(`/api/todos/${res.body.id}`);
    });

    it("trims a whitespace-padded title before validating/persisting", async () => {
      const res = await request(server)
        .post("/api/todos")
        .send({ title: "  Trimmed title  " })
        .expect(201);

      expect(res.body.title).toBe("Trimmed title");

      await request(server).delete(`/api/todos/${res.body.id}`);
    });

    it("returns a 422 Problem Details response for a blank title", async () => {
      const res = await request(server)
        .post("/api/todos")
        .send({ title: "   " })
        .expect(422);

      expect(res.headers["content-type"]).toContain("application/problem+json");
      expect(res.body).toEqual(
        expect.objectContaining({
          type: "about:blank",
          title: "Validation Failed",
          status: 422,
          code: "VALIDATION_ERROR",
          instance: "/api/todos",
        })
      );
      expect(res.body.errors).toBeDefined();
    });

    it("returns a 422 Problem Details response for an unknown field (whitelist policy)", async () => {
      const res = await request(server)
        .post("/api/todos")
        .send({ title: "Valid title", notAField: true })
        .expect(422);

      expect(res.body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /api/todos/:id", () => {
    it("returns 200 with the todo when it exists", async () => {
      const created = await request(server)
        .post("/api/todos")
        .send({ title: "Fetch me" })
        .expect(201);

      const res = await request(server)
        .get(`/api/todos/${created.body.id}`)
        .expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({ id: created.body.id, title: "Fetch me" })
      );

      await request(server).delete(`/api/todos/${created.body.id}`);
    });

    it("returns a 404 Problem Details response with the todo.not_found code for a missing id", async () => {
      const missingId = randomUUID();

      const res = await request(server)
        .get(`/api/todos/${missingId}`)
        .expect(404);

      expect(res.headers["content-type"]).toContain("application/problem+json");
      expect(res.body).toEqual(
        expect.objectContaining({
          type: "urn:problem:todo:not-found",
          title: "Not Found",
          status: 404,
          code: "todo.not_found",
          instance: `/api/todos/${missingId}`,
        })
      );
    });

    it("returns a 400 Problem Details response for a non-UUID id (ParseUUIDPipe)", async () => {
      const res = await request(server)
        .get("/api/todos/not-a-uuid")
        .expect(400);

      expect(res.body.status).toBe(400);
    });
  });

  describe("PATCH /api/todos/:id", () => {
    it("updates the todo and invalidates the cached detail/list entries", async () => {
      const created = await request(server)
        .post("/api/todos")
        .send({ title: "Before update" })
        .expect(201);
      const id = created.body.id as string;

      // populate the service-layer cache for this id (see TodoService#findOne)
      await request(server).get(`/api/todos/${id}`).expect(200);

      await request(server)
        .patch(`/api/todos/${id}`)
        .send({ title: "After update", isCompleted: true })
        .expect(200);

      // if invalidation didn't run, this would still return the stale,
      // pre-update cached value instead of hitting the database
      const res = await request(server).get(`/api/todos/${id}`).expect(200);

      expect(res.body).toEqual(
        expect.objectContaining({ title: "After update", isCompleted: true })
      );

      await request(server).delete(`/api/todos/${id}`);
    });

    it("returns a 404 Problem Details response when updating a missing id", async () => {
      const res = await request(server)
        .patch(`/api/todos/${randomUUID()}`)
        .send({ title: "Doesn't matter" })
        .expect(404);

      expect(res.body.code).toBe("todo.not_found");
    });
  });

  describe("DELETE /api/todos/:id", () => {
    it("deletes the todo, and a subsequent GET returns 404", async () => {
      const created = await request(server)
        .post("/api/todos")
        .send({ title: "Delete me" })
        .expect(201);
      const id = created.body.id as string;

      await request(server).delete(`/api/todos/${id}`).expect(200);
      await request(server).get(`/api/todos/${id}`).expect(404);
    });

    it("returns a 404 Problem Details response when deleting a missing id", async () => {
      const res = await request(server)
        .delete(`/api/todos/${randomUUID()}`)
        .expect(404);

      expect(res.body.code).toBe("todo.not_found");
    });
  });

  describe("GET /api/todos (list + cache)", () => {
    it("reflects newly created todos (cache invalidated on write)", async () => {
      const before = await request(server).get("/api/todos").expect(200);
      const beforeIds = new Set(
        (before.body as Array<{ id: string }>).map((t) => t.id)
      );

      const created = await request(server)
        .post("/api/todos")
        .send({ title: "Show up in the list" })
        .expect(201);

      const after = await request(server).get("/api/todos").expect(200);
      const afterIds = new Set(
        (after.body as Array<{ id: string }>).map((t) => t.id)
      );

      expect(beforeIds.has(created.body.id)).toBe(false);
      expect(afterIds.has(created.body.id)).toBe(true);

      await request(server).delete(`/api/todos/${created.body.id}`);
    });
  });
});
