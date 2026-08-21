# IMPORTANT: Node.js Version Maintenance
# This Dockerfile uses Node.js 24.13.0-slim, which was the latest LTS
# version at the time of writing. To ensure security and compatibility,
# regularly update the NODE_VERSION ARG to the latest LTS version.
ARG NODE_VERSION=24.18.0-slim

# ---------------------------------------------------------------------------
# Base: shared setup for all stages (pnpm via corepack, matches package.json
# "engines" pin). Kept separate from the other stages so the pnpm store
# cache mounted below is reused across build and prod-deps installs.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS base
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
# production: minimal production image. No pnpm, no source, no dev deps.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS production
WORKDIR /app

ENV NODE_ENV=production

# Create a secure, non-root user for security hardening
# (node:*-slim is Debian-based, so use groupadd/useradd — not the
# Alpine/BusyBox addgroup/adduser -S flags, which don't exist here)
RUN groupadd -r -g 1001 nodejs && useradd -r -g nodejs -u 1001 nestjs

COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json
# Assets nest-cli.json marks for copy (i18n JSON, email .hbs templates)
# aren't picked up by `nest build` for a plain `node dist/main` runtime,
# so bring them along explicitly.
COPY --from=build --chown=nestjs:nodejs /app/src/core/internationalization/i18n ./dist/core/internationalization/i18n
COPY --from=build --chown=nestjs:nodejs /app/src/core/email/templates ./dist/core/email/templates

# Run as the unprivileged user
USER nestjs

EXPOSE 3000

# Terminus health endpoint — adjust the port/path if APP_PORT or
# APP_ROUTE_PREFIX are overridden at deploy time.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:' + (process.env.APP_PORT || 3000) + '/livez', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
