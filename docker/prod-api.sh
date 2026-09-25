#!/bin/sh
# Prod entrypoint for the API image (baked in, WORKDIR /app/apps/api).
# Programmatic migrator — runs on bun, needs only drizzle-orm at runtime.
set -e

echo "› Applying database migrations…"
bun run db:migrate

echo "› Starting API…"
exec bun dist/main.js
