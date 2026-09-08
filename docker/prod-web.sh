#!/bin/sh
# Prod entrypoint for the web image (baked in, WORKDIR /app). Nitro's
# node-server output is self-contained.
set -e

echo "› Starting web…"
exec bun .output/server/index.mjs
