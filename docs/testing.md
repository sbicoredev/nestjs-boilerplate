# Testing

## Unit tests

```bash
pnpm run test          # run once
pnpm run test:watch    # watch mode
pnpm run test:cov      # with coverage report -> coverage/
pnpm run test:debug    # attach a debugger
```

Runs everything matching `*.spec.ts` under `src/` (Jest config in
`package.json`). No external services required — config specs
(`src/configs/*.config.spec.ts`) test `validatedConfig()` directly with
in-memory env objects, and unit specs mock their dependencies (see
`todo.controller.spec.ts` for the pattern: mock the service, assert the
controller delegates correctly).

**Convention**: every non-trivial file gets a co-located `.spec.ts` —
decorators, utils, config classes, filters, services, and controllers all
have one in this codebase. Follow that when adding new code.

## E2E tests

```bash
pnpm run test:e2e
```

Boots the **real** `AppModule` (`test/app.e2e-spec.ts`) — this means real
Postgres and Redis connections are required; there's no in-memory
substitute. `jest-e2e.json` config: `rootDir: "."`, matches `*.e2e-spec.ts`
under `test/`.

Because `ConfigModule` is set up with `skipProcessEnv: true`
(see [Configuration](./configuration.md)), ambient environment
variables are **ignored** — the app only reads `.env.test.local` under
`NODE_ENV=test`. To run e2e tests locally:

```bash
cp .env.example .env.test.local
# point DB_URL / REDIS_URL at your local docker-compose services
NODE_ENV=test pnpm run test:e2e
```

## CI

`.github/workflows/ci.yaml` runs two jobs on every PR:

1. **`lint-typecheck-unit`** — `pnpm run lint`, `pnpm run typecheck`,
   `pnpm run test:cov` (coverage uploaded as a build artifact). No
   external services needed.
2. **`e2e`** — spins up real `postgres` and `redis` service containers,
   generates `.env.test.local` pointing at them (job-level `env:` vars
   would be silently ignored otherwise — see above), then runs
   `pnpm run test:e2e`.

If you add a new required env var (per [Configuration](./configuration.md)),
add it to the `.env.test.local` heredoc in the `e2e` job too, or that job
will start failing at boot with a config validation error.

## Linting & formatting

```bash
pnpm run lint       # ultracite check (Biome under the hood)
pnpm run lint:fix   # ultracite fix
pnpm run typecheck  # tsc --noEmit
```

Enforced automatically on commit via Husky + lint-staged
(`.husky/pre-commit` runs `lint-staged`, configured in `package.json` to
run `ultracite fix` on staged files). `.husky/commit-msg` enforces
[Conventional Commits](https://www.conventionalcommits.org/) via
commitlint, and `.husky/pre-commit` also validates the current branch
name matches `<type>/<description>` (`feature/`, `hotfix/`, `bugfix/`,
`refactor/`, `test/`, `chore/`, `docs/`) before running lint-staged.

## Writing a good test in this codebase

Look at `src/configs/database.config.spec.ts` as the reference for config
tests: assert defaults, assert what's genuinely required vs optional,
assert type coercion (string env var → real boolean/number), assert range
validation (min/max) — not just the happy path.

For services, mock the repository/dependency and assert behavior, not
implementation — `todo.service.spec.ts` and `todo.controller.spec.ts` are
the pattern to copy for a new feature module.
