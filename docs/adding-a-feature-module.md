# Adding a Feature Module

`modules/todo/` is a working reference implementation — copy its shape
for a new feature rather than starting from a blank `nest g module`.

## Structure

```text
src/modules/<feature>/
├── dto/
│   ├── create-<feature>.dto.ts
│   └── update-<feature>.dto.ts
├── entities/
│   └── <feature>.entity.ts
├── <feature>.controller.ts
├── <feature>.controller.spec.ts
├── <feature>.service.ts
├── <feature>.service.spec.ts
└── <feature>.module.ts
```

## Step by step

1. **Entity** (`entities/<feature>.entity.ts`) — a plain TypeORM entity.
   No manual registration needed anywhere global (`autoLoadEntities: true`
   — see [Database](./database.md#adding-an-entity)).

2. **DTOs** (`dto/`) — `class-validator` decorators for input validation,
   `@nestjs/swagger`'s `@ApiProperty()` for docs. Use `PartialType()` for
   the update DTO rather than duplicating fields (`UpdateTodoDto` extends
   `PartialType(CreateTodoDto)`). Trim/transform user input where
   correctness depends on it (see `CreateTodoDto`'s title-trimming
   `@Transform`, which prevents a whitespace-only string slipping past
   `@IsNotEmpty()`).

3. **Service** (`<feature>.service.ts`) — inject the repository via
   `@InjectRepository()`, and `CacheService` if this resource benefits
   from caching (see [Caching](./caching.md#cache-invalidation-pattern)
   for the exact pattern: cache successes, not 404s; invalidate
   explicitly on every write). Throw standard `HttpException` subclasses
   for error cases — see [Error Handling](./error-handling.md).

4. **Controller** (`<feature>.controller.ts`) — thin: validate via DTOs
   (handled automatically by the global pipe), delegate to the service,
   return its result directly. Add `@ParseUUIDPipe` (or another
   appropriate pipe) on any `:id` route param so a malformed id 400s
   cleanly instead of reaching the repository as a raw, un-typed string.
   If you're handling caching explicitly in the service (step 3),
   `@SkipCache()` the controller so the global HTTP cache interceptor
   doesn't also try to cache it (see
   [Caching](./caching.md#http-response-caching-skipcache)).

5. **Module** (`<feature>.module.ts`) — `TypeOrmModule.forFeature([Entity])`,
   register the controller and service. `CacheService` doesn't need
   importing — `CacheModule` is `@Global()`.

6. **Register it** in `app.module.ts`'s `imports: [...]`.

7. **Tests** — a `.spec.ts` next to each controller/service, mocking the
   layer below (mock the service in the controller spec, mock the
   repository in the service spec). See `todo.controller.spec.ts` /
   `todo.service.spec.ts`.

8. **Migration** — `make migration-gen` once the entity exists (see
   [Database](./database.md#writing-a-migration)); review the
   generated SQL before committing.

## What NOT to copy from `todo`

- It has no pagination on `findAll()` — fine for a reference module, not
  fine for a real list endpoint at any meaningful scale. Add
  limit/offset or cursor pagination for real resources.
- It has no authorization — every route is open. Apply your auth guards
  once they exist (see [API Documentation](./api-documentation.md#auth-schemes-are-pre-registered)
  for the pre-registered OpenAPI security schemes waiting for them).
