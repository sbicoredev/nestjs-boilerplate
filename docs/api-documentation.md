# API Documentation

## Scalar (dev-only)

OpenAPI docs are generated from your controllers/DTOs (`@nestjs/swagger`
decorators) and served through [Scalar](https://scalar.com)'s API
reference UI (`common/utils/setup-openapi.ts`), mounted at `/docs`
(`SWAGGER_PATH`, `common/constants/config.ts`).

This is **only mounted in `development`** (see the `environment` check in
`main.ts`) — in every other environment, `setupGracefulShutdown()` runs
instead. This is a deliberate tradeoff (don't expose a docs UI + full
schema in production by default), not an oversight — if you need docs
available in staging, gate it on an explicit env var rather than widening
the `development` check, and reconsider the Helmet CSP
(`common/constants/security.ts`) which is scoped to allow Scalar's CDN
assets.

## Auth schemes are pre-registered

`setupOpenApi()` already registers three security schemes even though no
auth exists yet in this boilerplate (see the README's "Not yet included"
note):

- `accessToken` — Bearer/JWT
- `refreshToken` — Bearer/JWT
- `apiKey` — `x-api-key` header

Apply them to a controller/route once you add real auth guards:

```ts
@ApiBearerAuth("accessToken")
@UseGuards(AccessTokenGuard)
@Controller("users")
export class UsersController {}
```

There's also a second source pre-wired into the Scalar UI config,
pointing at `/api/auth/open-api/generate-schema` — a placeholder for a
"Better Auth"-style auth schema generation endpoint. It's inert until
something actually serves that path; remove it from `setup-openapi.ts` if
you're not going that route, or wire it up if you are.

## Documenting a new endpoint

Standard `@nestjs/swagger` decorators — `@ApiTags()`, `@ApiOperation()`,
`@ApiProperty()` on DTOs, `@ApiResponse()` for non-default responses.
`TodoController`/`CreateTodoDto` are the reference for the minimal set
(`@ApiTags`, `@ApiProperty` with an `example`).

## Versioning

URI-based (`app.enableVersioning({ type: VersioningType.URI, defaultVersion:
VERSION_NEUTRAL })` in `main.ts`) — routes without an explicit
`@Controller({ version: "1" })` are reachable unversioned; add a version
once you need to introduce a breaking change to an existing route rather
than from day one.
