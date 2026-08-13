# Error Handling

## The `ApiErrorResponse` envelope

Every error response — regardless of cause — has this shape
(`common/dtos/api-error-response.dto.ts`):

```json
{
  "timestamp": "2026-08-13T12:00:00.000Z",
  "requestId": "req_iHGbz6QBaJxWI2eCaVp6R",
  "path": "/api/todos/123",
  "statusCode": 404,
  "message": "Todo with id \"123\" not found",
  "errors": { "field": ["error"] },
  "context": { "info": {}, "error": {}, "details": {} }
}
```

`errors` (validation failures) and `context` (extra structured detail,
currently only used for health-check breakdowns) are both optional and
absent for most errors.

## Three filters, tried in order

Registered as `APP_FILTER` providers in `app.module.ts`:

1. **`UnprocessableEntityExceptionFilter`** — catches
   `UnprocessableEntityException` specifically. The global `ValidationPipe`
   is configured (`app.module.ts`) to throw this (422) instead of Nest's
   default `BadRequestException` (400) on validation failure, with the
   raw `class-validator` `ValidationError[]` attached. This filter reduces
   that into `errors: { fieldName: ["constraint message", ...] }`.
2. **`HealthCheckExceptionFilter`** — catches `ServiceUnavailableException`
   specifically (what `@nestjs/terminus` throws when a health indicator
   fails). Defensively checks the response shape looks like a Terminus
   result before treating it as one — a plain
   `ServiceUnavailableException` thrown for an unrelated reason (e.g. a
   future maintenance-mode feature) falls through to generic handling
   instead of being misparsed. When it _is_ a Terminus result, attaches
   `context: { info, error, details }` so a caller can tell **which**
   dependency (Postgres/Redis/memory) failed and why, instead of a bare
   "Service Unavailable."
3. **`GlobalExceptionFilter`** (`@Catch()`, no argument — catches
   everything else) — the fallback. For any `HttpException`, uses its
   real status/message. For anything else (an unexpected thrown error),
   returns a generic `500` / `"Internal server error"` rather than leaking
   internal error details (stack traces, library error messages) to the
   client. The actual exception is always logged server-side either way
   (except for `/favicon.ico` noise).

NestJS tries filters in registration order and uses the most specific
match, so `UnprocessableEntityExceptionFilter` and
`HealthCheckExceptionFilter` only ever see their specific exception type;
everything else falls through to `GlobalExceptionFilter`.

## Throwing errors in your own code

Just throw a standard Nest `HttpException` subclass — `NotFoundException`,
`BadRequestException`, `ConflictException`, etc. — from your service or
controller. `TodoService` is the reference:

```ts
if (!todo) {
  throw new NotFoundException(`Todo with id "${id}" not found`);
}
```

You don't need to construct `ApiErrorResponse` yourself — the global
filters do that for every exception automatically. Only reach for a
custom filter if you need to attach `context` beyond what
`GlobalExceptionFilter` provides (following the `HealthCheckExceptionFilter`
pattern), which should be rare.

## Shared building block

Both `GlobalExceptionFilter` and `HealthCheckExceptionFilter` build their
base response via `buildApiErrorResponse()`
(`common/utils/build-api-error-response.ts`) rather than duplicating the
status/message/timestamp logic — if you add a new filter, use this too
rather than reimplementing it, so the envelope stays consistent by
construction.
