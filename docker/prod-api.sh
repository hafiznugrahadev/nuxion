#!/bin/sh
# Prod entrypoint for the API image (baked in, WORKDIR /app/apps/api).
# `bun run` resolves the local prisma CLI from node_modules/.bin (no network).
set -e

echo "› Applying database migrations…"
bun run prisma:deploy

echo "› Starting API…"
exec bun dist/main.js
