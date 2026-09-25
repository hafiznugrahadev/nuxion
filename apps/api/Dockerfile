# syntax=docker/dockerfile:1
# Multi-stage build for @nuxion/api (NestJS + Drizzle on Bun).
# Build context MUST be the repo root: `docker build -f apps/api/Dockerfile .`

# ─────────────────────────────── deps ────────────────────────────────────────
# Cached install from the lockfile. --ignore-scripts skips workspace postinstalls
# (e.g. web's `nuxt prepare`, which needs the shared-types build that runs later).
# bcrypt ships prebuilt binaries, so it needs no install script.
FROM oven/bun:1.4.2 AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN bun install --frozen-lockfile --ignore-scripts

# ─────────────────────────────── build ───────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api
RUN bun run --filter @nuxion/shared-types build \
 && bun run --filter @nuxion/api build

# ─────────────────────────────── runtime ─────────────────────────────────────
FROM oven/bun:1.4.2-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api
# CA roots for TLS connections to managed Postgres/Redis.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*
# Bun installs per workspace, so copy BOTH the hoisted root node_modules and
# the api's own node_modules (its deps + drizzle-orm for the migrator script).
# `bun run db:migrate` executes scripts/db-migrate.ts on the fly — no CLI, no
# generated client needed at runtime.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/packages/shared-types/dist /app/packages/shared-types/dist
COPY --from=build /app/packages/shared-types/package.json /app/packages/shared-types/package.json
COPY --from=build /app/apps/api/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/drizzle ./drizzle
COPY --from=build /app/apps/api/scripts ./scripts
COPY --from=build /app/apps/api/package.json ./package.json
# Entrypoint script: migrate, then boot (see docker/prod-api.sh). For multiple
# replicas, run the migration as a separate release step instead.
COPY docker/prod-api.sh /app/docker/prod-api.sh
EXPOSE 4400
ENTRYPOINT ["sh", "/app/docker/prod-api.sh"]
