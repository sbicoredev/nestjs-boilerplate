# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Base: shared setup for all stages (pnpm via corepack, matches package.json
# "engines" pin). Kept separate from the other stages so the pnpm store
# cache mounted below is reused across build and prod-deps installs.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@11 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# deps: install *all* dependencies (incl. dev) needed to build the app.
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# build: compile TypeScript -> dist, using the full (incl. dev) deps.
# ---------------------------------------------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build
# Drop dev dependencies now that the build output exists, so the next
# stage only has to copy production node_modules.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm prune --prod

# ---------------------------------------------------------------------------
# runner: minimal production image. No pnpm, no source, no dev deps.
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

# Run as a non-root user rather than the default root.
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json

# Assets nest-cli.json marks for copy (i18n JSON, email .hbs templates)
# aren't picked up by `nest build` for a plain `node dist/main` runtime,
# so bring them along explicitly.
COPY --from=build --chown=nestjs:nodejs /app/src/core/internationalization/i18n ./dist/core/internationalization/i18n
COPY --from=build --chown=nestjs:nodejs /app/src/core/email/templates ./dist/core/email/templates

USER nestjs

EXPOSE 3000

# Terminus health endpoint — adjust the port/path if APP_PORT or
# APP_ROUTE_PREFIX are overridden at deploy time.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.APP_PORT || 3000) + (process.env.APP_ROUTE_PREFIX || '/api') + '/livez', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
