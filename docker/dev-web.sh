#!/bin/sh
# Dev entrypoint for the web container (source is bind-mounted at /app).
# --ignore-scripts skips `nuxt prepare` (it needs shared-types built first);
# `nuxt dev` runs prepare itself once shared-types exists.
set -e

echo "› Installing dependencies…"
bun install --frozen-lockfile --ignore-scripts

echo "› Building @nuxion/shared-types…"
bun run --filter @nuxion/shared-types build

echo "› Starting web (HMR)…"
exec bun run --filter @nuxion/web dev
