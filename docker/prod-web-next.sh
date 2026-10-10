#!/bin/sh
# Prod entrypoint for the web-next image (baked in, WORKDIR /app). Next's
# standalone output keeps the monorepo layout, so the server lives under
# apps/web-next/. PORT and NEXT_API_INTERNAL_BASE come from compose.
set -e

echo "› Starting web-next…"
exec bun apps/web-next/server.js
