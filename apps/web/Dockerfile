# syntax=docker/dockerfile:1
# Multi-stage build for @nuxion/web (Nuxt 4 / Nitro node-server on Bun).
# Build context MUST be the repo root: `docker build -f apps/web/Dockerfile .`

# ─────────────────────────────── deps ────────────────────────────────────────
# --ignore-scripts skips `nuxt prepare` here; it would fail because shared-types
# isn't built yet. `nuxt build` re-runs prepare later, after shared-types exists.
FROM oven/bun:1.4.0 AS deps
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
COPY apps/web ./apps/web
# Bake the public API base into the client bundle at build time.
ARG NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE}
# shared-types first (web imports it); call nuxt directly so the package script's
# `--dotenv ../../.env` (absent in the image) is bypassed in favour of this ENV.
RUN bun run --filter @nuxion/shared-types build \
 && cd apps/web && bunx nuxt build

# ─────────────────────────────── runtime ─────────────────────────────────────
# Nitro's node-server output is self-contained — only .output is needed.
FROM oven/bun:1.4.0-slim AS runtime
ENV NODE_ENV=production
ENV PORT=4300
ENV HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/apps/web/.output ./.output
COPY docker/prod-web.sh /app/docker/prod-web.sh
EXPOSE 4300
ENTRYPOINT ["sh", "/app/docker/prod-web.sh"]
