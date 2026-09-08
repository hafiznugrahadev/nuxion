#!/bin/sh
# Entrypoint for the `db-tools` service (source is bind-mounted at /app).
# Any arguments are forwarded straight to the restore CLI, e.g.
#   docker compose run --rm db-tools --latest
set -e

# The api container normally populates the shared node_modules volume. When
# db-tools runs first (or on a fresh volume), install them here. --ignore-scripts
# mirrors docker/dev-api.sh: workspace postinstalls would hang the install.
if [ ! -d /app/node_modules/dotenv ]; then
  echo "› Installing dependencies…"
  bun install --frozen-lockfile --ignore-scripts
fi

# cwd = apps/api so the CLI resolves the root .env at ../../.env, as it does on the host.
cd /app/apps/api
exec bun run scripts/db-restore.ts "$@"
