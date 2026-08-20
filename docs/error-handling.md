# Error Handling

## The Problem Details envelope (RFC 9457)

Every error response — regardless of cause — is served as
`application/problem+json` (see `PROBLEM_DETAILS_CONTENT_TYPE`,
`common/constants/problem-types.ts`) with this shape
(`common/dtos/problem-details.dto.ts`):

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "Todo with id \"123\" not found",
  "instance": "/api/todos/123",
  "requestId": "01a01ef4-f4c8-7031-b8e5-5becd1d31483",
  "timestamp": "2026-08-13T12:00:00.000Z"
}
```

`type`, `title`, `status`, `detail`, and `instance` are the members
[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) itself defines.
`requestId` and `timestamp` are this app's own extension members — the RFC
explicitly allows adding these. `type` defaults to `about:blank`
(RFC 9457 §4.2.1: "the problem has no additional semantics beyond that of
the HTTP status code") for generic exceptions; two categories get a more
specific identity, each with its own extension member:

- **Validation failures** (`type: "/errors/validation-failed"`) add
  `invalid-params`, an array of `{ name, reason }` — one entry per failed
  field constraint, following the shape RFC 9457's own §3.2 example uses.
- **Health-check failures** (`type: "/errors/health-check-failed"`) add
  `context: { info, error, details }`, so a caller can tell **which**
  dependency (Postgres/Redis/memory) failed and why, instead of a bare
  "Service Unavailable."

`type` values here are deliberately relative (`/errors/...`) rather than
tied to a hardcoded domain, since this app is meant to be self-hosted under
whatever origin a given deployment uses. Per the RFC, consumers must not
auto-dereference `type` — these paths don't currently serve actual
documentation pages, they're just stable identifiers.

Success responses (2xx) are completely untouched by any of this — they
stay plain `application/json` as returned by your controller.

## Three filters, tried in order

Registered as `APP_FILTER` providers in `app.module.ts`:

- **`GlobalExceptionFilter`** (`@Catch()`, no argument — catches
   everything else) — the fallback. For any `HttpException`, uses its
   real status/message as `detail`, and the standard HTTP reason phrase
   (`node:http`'s `STATUS_CODES`) as `title`. For anything else (an
   unexpected thrown error), returns a generic `500` /
   `"Internal server error"` rather than leaking internal error details
   (stack traces, library error messages) to the client. The actual
   exception is always logged server-side either way (except for
   `/favicon.ico` noise).

## Throwing errors in your own code

Just throw a standard Nest `HttpException` subclass — `NotFoundException`,
`BadRequestException`, `ConflictException`, etc. — from your service or
controller. `TodoService` is the reference:

```ts
if (!todo) {
  throw new NotFoundException(`Todo with id "${id}" not found`);
}
```

You don't need to construct a `ProblemDetails` object yourself — the global
filters do that for every exception automatically. Only reach for a
custom filter if you need to attach an extension member beyond what
`GlobalExceptionFilter` provides.
