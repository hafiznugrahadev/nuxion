# ERRORS.md — Approach Log

> Rules: check this file before suggesting approaches to similar tasks.
> If a task matches a logged failure, say so and skip straight to what worked.
> Log anything that took more than 2 attempts.

---

## OrbStack dev domains after container restart

**What didn't work:** `docker compose restart web` (and any container auto-restart) breaks `*.orb.local` domain routing — every request returns HTTP 426 "Upgrade Required" (plain-text, no server header) while `localhost:<published-port>` and docker-network access keep returning 200. Plain `restart` again did not fix it. The 426 is a `ws`-style rejection: OrbStack re-registers domain→container routing at container-**create** time, not at start.

**What worked:** `docker compose up -d --force-recreate web` — domain healthy immediately after. Also: stale browser state from the broken window (pooled sockets / cached error page) needs a full Chrome quit (Cmd+Q) or `chrome://net-internals/#sockets` → Flush socket pools; incognito/fresh profiles were never affected.

**Note for next time:** Never `restart` dev containers in this stack — always `--force-recreate`. After any recreate, `curl -sk https://web.nuxion-dev.orb.local/` before assuming the app is broken.

---

## Host-side local verification against the API

**What didn't work:** (1) Browser fetch to the API failed with opaque `net::ERR_FAILED` while `curl` returned 200 — root cause CORS: root `.env` sets `CORS_ORIGIN=https://web.nuxion-dev.orb.local`, so localhost origins get no `Access-Control-Allow-Origin` header. (2) A production-preview server (from `nuxt build`) silently used a baked-in `NUXT_PUBLIC_API_BASE=https://api.nuxion-dev.orb.local` (env present at build time), sending logins to an unreachable host.

**What worked:** Restart the API with `CORS_ORIGIN=http://localhost:4300` and start the preview with `PORT=4300 NUXT_PUBLIC_API_BASE=http://localhost:4400/api node apps/web/.output/server/index.mjs` — runtime env wins over build-time runtime config.

**Note for next time:** `ERR_FAILED` (not `ERR_CONNECTION_REFUSED`) on an XHR that curls fine = check CORS allowlist first. Nuxt `runtimeConfig.public` bakes whatever env existed at build time; always pass the env at serve time too.

---

## Running the Nuxt dev server via turbo from the repo root

**What didn't work:** `bun run --filter @nuxion/web dev` from the repo root — Nuxt's vite-node bridge crashed with `connect EINVAL <unix-socket>` (vite-node socket EINVAL; Bun-vs-Node quirk in this launch path) and served 500s. Root `.env` (`WEB_PORT`) also wasn't picked up that way — the server listened on :3000, not :4300.

**What worked:** For verification, skip the dev server entirely and run the production build output (`node .output/server/index.mjs`) with runtime env overrides. The OrbStack compose path (`docker/dev-web.sh`) runs dev fine — the breakage is specific to turbo-filtered `dev` from the host.

**Note for next time:** Host-side `web dev` → prefer `cd apps/web && bun run dev`; for screenshot-level verification the built preview is faster and more faithful than fighting dev-server plumbing.

---

## bun install silently "succeeding" through a pipe

**What didn't work:** `bun install 2>&1 | tail -3` reported exit 0 while the install had actually failed with registry resolution errors (`@inquirer/password`, `lodash`, `readdirp` failed to resolve) — the pipe swallowed bun's exit code, and stale `node_modules`/`bun.lock` (still holding @nestjs 12 / tanstack 9 after manifest reverts) made subsequent gates fail confusingly. The local registry is also intermittently slow/stally (~6-minute stalls).

**What worked:** Run `bun install > log 2>&1; echo $?` (no pipe), retry on resolution errors, then verify the lockfile actually re-synced (`grep '"@nestjs/common": "^11' bun.lock`) before running gates.

**Note for next time:** Never trust a piped package-manager exit code; after editing manifests, confirm the lockfile entries flipped before building.

---

## IDDS font still rendering as Inter after the swap

**What didn't work:** Removing Inter's Google-Fonts `@import` (bun patch) + setting `--font-sans` to Google Sans + swapping the head `<link>` — admin pages still computed Inter. Reason: `@idds/styles/dist/base.css` declares `font-family: 'Inter', …` directly on `<body>`; a direct element declaration beats inheritance from `<html>`'s `font-family: var(--font-sans)` regardless of import order.

**What worked:** Re-declare `body { font-family: var(--font-sans); }` in our `main.css` (loaded after the package import) — computed styles on the dashboard then resolved to Google Sans/Poppins with zero Inter fonts loaded.

**Note for next time:** When a package reset styles elements directly, override the same selector in app CSS — inheritance-based overrides will silently lose.

---

## Dev container node_modules volume not re-linking after manifest changes

**What didn't work:** After changing dependency versions on the host (lockfile rewritten), `docker compose up -d --force-recreate api` re-ran the entrypoint's `bun install --frozen-lockfile` — the new packages were extracted into `node_modules/.bun` (both old and new versions present) but the workspace symlinks (`apps/api/node_modules/@nestjs/core`) still pointed at the OLD version, so the app silently ran the old dependency tree.

**What worked:** Stop + remove the container, delete its named volume (`docker volume rm nuxion-dev_api_node_modules`), `docker compose up -d api` — the cold install links the new versions. Verify with `docker exec nuxion-api-dev grep '"version"' /app/apps/api/node_modules/@nestjs/core/package.json` (workspace path — the ROOT `node_modules/@nestjs/*` may legitimately not exist under bun's isolated layout).

**Note for next time:** After any dependency bump, check the version INSIDE the container (workspace node_modules path), not just that the container boots. If stale: volume wipe beats re-create.
