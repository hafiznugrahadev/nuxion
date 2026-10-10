# syntax=docker/dockerfile:1
# Multi-stage build for @nuxion/web-next (Next.js standalone on Bun).
# Build context MUST be the repo root: `docker build -f apps/web-next/Dockerfile .`

# ─────────────────────────────── deps ────────────────────────────────────────
# --ignore-scripts keeps the install hermetic (no postinstall chain); Next has
# none, and shared-types isn't built yet at this stage.
FROM oven/bun:1.4.2 AS deps
WORKDIR /app
COPY package.json bun.lock turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/web-next/package.json ./apps/web-next/
RUN bun install --frozen-lockfile --ignore-scripts

# ─────────────────────────────── build ───────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY packages/shared-types ./packages/shared-types
COPY apps/web-next ./apps/web-next
# No API-base build args: the browser uses the same-origin /api proxy (route
# handlers), and NEXT_API_INTERNAL_BASE is read at RUNTIME — the compose
# contract the Nuxt variant already follows. shared-types first (web-next
# imports it); call next directly so the package script's dotenv wrapper
# (which expects the repo root .env) is bypassed in favour of this ENV.
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run --filter @nuxion/shared-types build \
 && cd apps/web-next && bunx next build

# ─────────────────────────────── runtime ─────────────────────────────────────
# Next's standalone output is self-contained (server.js + vendored
# node_modules). In this monorepo the standalone tree keeps the workspace
# layout, so static/ and public/ are copied back to their mirrored paths.
FROM oven/bun:1.4.2-slim AS runtime
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build /app/apps/web-next/.next/standalone ./
COPY --from=build /app/apps/web-next/.next/static ./apps/web-next/.next/static
COPY --from=build /app/apps/web-next/public ./apps/web-next/public
COPY docker/prod-web-next.sh /app/docker/prod-web-next.sh
EXPOSE 8080
ENTRYPOINT ["sh", "/app/docker/prod-web-next.sh"]
