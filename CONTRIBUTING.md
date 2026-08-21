# Contributing

Thanks for taking the time to contribute. This document covers the
mechanics of making a change — for how the codebase is put together, start
with [`docs/architecture.md`](./docs/architecture.md).

## Prerequisites

See [Getting started](./docs/getting-started.md) for local setup
(Node.js, pnpm, Docker).

## Workflow

1. **Branch from `main`.** Branch names must match `<type>/<description>`,
   enforced by a pre-commit hook:

   ```text
   feature/user-authentication
   hotfix/urgent-patch-crash
   bugfix/fix-login-error
   refactor/remove-unused-code
   test/add-unit-tests
   chore/update-docker-compose
   docs/add-api-instructions
   ```

2. **Make your change.** Add or update tests alongside it — see
   [`docs/testing.md`](./docs/testing.md). If you're adding a new feature
   module, [`docs/adding-a-feature-module.md`](./docs/adding-a-feature-module.md)
   walks through the `todo` module as a template.

3. **Commit using [Conventional Commits](https://www.conventionalcommits.org/)**,
   enforced by Commitlint on every commit:

   ```text
   feat(cache): add TTL override per key
   fix(auth): correct token expiry check
   docs(readme): fix lint script name
   ```

   `lint-staged` runs Biome/Ultracite (and markdownlint for `.md` files)
   automatically on staged files at commit time — fix anything it flags
   before committing.

4. **Open a pull request against `main`.** Fill out the PR template — it
   maps directly to what CI checks. CI runs `pnpm audit`, lint, docs lint,
   typecheck, unit tests, e2e tests against real Postgres/Redis service
   containers, and CodeQL static analysis (see
   [`docs/testing.md`](./docs/testing.md)). All checks must pass before
   merge.

## Architecture decisions

If your change makes a significant, hard-to-reverse decision (a new
dependency, a structural pattern future contributors would otherwise
re-litigate), add an ADR under [`docs/adr/`](./docs/adr/) using
[`docs/adr/0000-template.md`](./docs/adr/0000-template.md). Don't
retroactively write one for existing, unrelated decisions.

## Reporting bugs and requesting features

Open an issue with reproduction steps (for bugs) or the problem you're
trying to solve (for features). For security issues, do **not** open a
public issue — see [`SECURITY.md`](./SECURITY.md) for how to report
privately.

## Code of conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md).
