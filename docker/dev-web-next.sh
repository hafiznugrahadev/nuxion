#!/bin/sh
# Dev entrypoint for the web-next container (source is bind-mounted at /app).
# Mirrors docker/dev-web.sh: install hermetically, build the shared workspace,
# then hand over to the dev server (scripts in apps/web-next resolve the root
# .env and the port).
set -e

echo "› Installing dependencies…"
bun install --frozen-lockfile --ignore-scripts

echo "› Building @nuxion/shared-types…"
bun run --filter @nuxion/shared-types build

echo "› Starting web-next (Turbopack HMR)…"
exec bun run --filter @nuxion/web-next dev
