# Project Decision Log

Read this file at the start of every session. Never contradict a logged decision without flagging it first.

---

## 2026-06-06, SelectField — searchable dropdown implementation

**What was decided:** Use reka-ui `PopoverRoot` + custom `<input>` search + `<ul>` option list. Filter is computed in script, not delegated to reka-ui.

**Why:** reka-ui's `ComboboxRoot` filters against item _values_ (not labels), requiring a custom `filterFunction` that only receives value strings — not label strings. Full manual control over filtering, trigger layout, and multi-select tags was simpler and more explicit.

**What was rejected:**

- `ComboboxRoot` from reka-ui — filter API doesn't map cleanly to label-based search without workarounds.
- Native `<select>` — no search, no custom styling.

---

## 2026-06-06, SelectField — multi-select via `multiple` prop

**What was decided:** A single `SelectField.vue` handles both single and multi-select via the `multiple` boolean prop. Value type is `string | string[]` at the vee-validate layer.

**Why:** The UI logic (popover, search, options list) is identical. Only the trigger display (tags vs text) and selection behavior (toggle vs close-on-select) differ. One component is easier to maintain and compose.

**What was rejected:**

- Separate `MultiSelectField.vue` — code duplication for near-identical UI; callers would need to remember two component names for the same concept.

---

## 2026-06-06, `required` prop — asterisk pattern

**What was decided:** All field components accept a `required?: boolean` prop that renders `<span class="ml-0.5 text-destructive">*</span>` inline in the label.

**Why:** Consistent across all fields, no slot boilerplate at call sites, uses the existing `text-destructive` token.

**What was rejected:**

- `<template #label>` slot with manual `<span>` — verbose at every usage site (seen in original `login.vue`).
- CSS `::after` pseudo-element — harder to control spacing and colour with Tailwind v4.

---

## 2026-06-06, PasswordField — separate component

**What was decided:** `PasswordField.vue` is a dedicated component (not `TextField` with `type="password"`) that owns the `show` toggle state and `Eye`/`EyeOff` icons internally.

**Why:** The show/hide toggle is always coupled with password inputs. Keeping state internal means consumers don't need to manage `showPassword` or pass `Eye`/`EyeOff` icons. `ChangePasswordCard.vue` and `login.vue` both benefit.

**What was rejected:**

- `TextField` with `showToggle` prop — leaks icon imports and toggle logic into a generic component.
- Inline implementation per page — duplicated across login, register, change-password.

---

## 2026-06-06, FileField — hidden native input + styled trigger

**What was decided:** `FileField.vue` hides the native `<input type="file">` with `sr-only` and renders a styled "Choose file" button that calls `inputRef.click()`. Selected filename is displayed inline; an `X` button clears the value.

**Why:** Native file inputs are browser-styled and inconsistent. This approach gives full visual control while preserving native file dialog behaviour and accessibility (the `<input>` is still in the DOM for screen readers).

**What was rejected:**

- Drag-and-drop zone — over-engineered for most form use cases; can be added as a separate `DropzoneField` later if needed.
- Wrapping `Input` component — shadcn `Input` doesn't support `type="file"` cleanly.

---

## 2026-06-06, DateField — native `<input type="date">`

**What was decided:** `DateField.vue` uses a styled native `<input type="date">`. Value is a `string` in `YYYY-MM-DD` format.

**Why:** reka-ui's `Calendar` component requires `@internationalized/date` which is not in the project dependencies. A native date input is zero-dependency, SSR-safe, and sufficient for most data-entry forms.

**What was rejected:**

- reka-ui `CalendarRoot` + `Popover` — requires `@internationalized/date`, adds complexity, and the project doesn't have the dependency.
- A custom date-string parser — unnecessary complexity given the native input handles format correctly.

---

## 2026-06-06, Fields demo page location

**What was decided:** Demo page at `apps/web/app/pages/demo/fields.vue` (route `/demo/fields`), using the `dashboard` layout and `auth` middleware. Linked from the sidebar with a `FlaskConical` icon.

**Why:** Keeping demos under `/demo/` namespaces them cleanly away from production routes. The dashboard layout gives the full app chrome (sidebar, header) so field styling is tested in real context.

**What was rejected:**

- Standalone page without layout — wouldn't reflect real usage context.
- `/fields` at root level — pollutes top-level routes with a non-production page.

---

## 2026-06-06, File storage — driver abstraction, local default, lazy S3

**What was decided:** A `@Global` `StorageModule` (`apps/api/src/infrastructure/storage/`) with a `StorageDriver` contract and two drivers: `local` (default, writes to `apps/api/storage/uploads`, served as static assets) and `s3` (AWS S3 / MinIO / RustFS). Driver chosen via `STORAGE_DRIVER` env. The S3 driver loads `@aws-sdk/client-s3` **lazily** via a `string`-typed dynamic-import specifier so the compiler treats it as optional.

**Why:** Mirrors the existing `RedisModule` infra pattern (SPEC DRY #10). Local default = zero-infra: the starter kit runs uploads with no extra services. Lazy S3 load means `local` deployments never need the AWS SDK installed or even resolvable at compile time — which also fixed a real failure: the dev API container's `api_node_modules` volume didn't have `@aws-sdk` hoisted where tsc could resolve it, so a static import broke the in-container build. Size/MIME guardrails live in `StorageService` (config-driven), not in the controller's `ParseFilePipe`, so they read `ConfigService` at runtime.

**What was rejected:**

- Static `import { S3Client } from '@aws-sdk/client-s3'` — forces the SDK on every deployment and broke the container build (node_modules hoisting under the volume).
- `@nestjs/serve-static` module / `express.static` direct import — `express` is only a transitive dep of `@nestjs/platform-express`, so `import express` fails at runtime (`Cannot find package 'express'`). Used `app.useStaticAssets()` on `NestExpressApplication` instead (first-class, no direct express import).
- MinIO forced into docker-compose — kept optional/documented in `.env.example`; local driver covers dev.

---

## 2026-06-06, Upload endpoint shape — generic `POST /files` + profile PATCH

**What was decided:** A generic, auth-protected `POST /files?folder=<slug>` returns `{ key, url, mimeType, size }`. The avatar flow is two steps: FE `useUpload()` composable uploads → gets URL → PATCHes `/users/me` with `avatarUrl`. Local files are served at `/uploads/*` (outside the `api` prefix and the `ResponseInterceptor`, so binary streams untouched).

**Why:** A reusable upload primitive is the starter-kit value — any feature/form (incl. the `FileField` component) can compose `useUpload()`. Serving outside the interceptor is mandatory: the global `ResponseInterceptor` wraps every Nest route in `{success,data}`, which would corrupt binary responses. `folder` is sanitised server-side to a slug to block path traversal.

**What was rejected:**

- Dedicated `POST /users/me/avatar` (upload+set in one call) — nicer UX but not reusable; the generic endpoint demonstrates the pattern better. Trade-off accepted: a possible orphan file if the PATCH never lands (fine for a starter kit).
- Serving files through a Nest controller — would hit the response interceptor and need `@Res()` passthrough hacks.

---

## 2026-06-06, Dev DB migrations target docker Postgres on host port 5433

**What was decided:** Run Prisma migrate from the host with `DATABASE_URL=postgresql://nuxion:nuxion@localhost:5433/...` (the docker-published port), NOT the `.env` value (`localhost:5432`).

**Why:** The app runs inside docker and reaches Postgres at the internal host `postgres:5432` (compose-injected). The repo `.env` `DATABASE_URL` uses `localhost:5432`, but the host has _another_ Postgres on 5432 — so the host Prisma CLI hit the wrong server and failed `P1010: denied access`. The docker Postgres is published at host `5433` (`POSTGRES_PORT=5433`), where the `nuxion` user is a superuser (so `migrate dev`'s shadow DB works). `prisma.config.ts` loads `../../.env` via dotenv, but a shell-set `DATABASE_URL` wins (dotenv doesn't override existing env). Alternatively run the CLI inside the container.

**What was rejected:**

- `prisma db push` — skips the migration history the repo maintains (`prisma/migrations/`).
- Running migrate against `localhost:5432` — wrong Postgres instance (P1010).

> Note: `prisma migrate dev` here does NOT auto-regenerate the client — run `bunx prisma generate` explicitly after each migration (observed twice: avatar + reset-token migrations).

---

## 2026-06-06, Mail — `@Global` MailModule, log default, lazy SMTP, fully config-driven

**What was decided:** A `@Global` `MailModule` (`apps/api/src/infrastructure/mail/`) with a `MailTransport` contract and two transports: `log` (default — writes emails to the API logs, zero-infra) and `smtp` (nodemailer, **lazy-loaded** via a `string`-typed dynamic import). Everything flows through ConfigService/env: `MAIL_TRANSPORT`, `MAIL_FROM`, `MAIL_SMTP_*`. Same pattern as `StorageModule`/`RedisModule`.

**Why:** The user explicitly required mail to be configurable via ConfigService + env. The `log` default makes the password-reset flow fully testable with zero infra — the reset link appears in the logs (verified the e2e by grepping the token from `docker logs`). Lazy SMTP keeps nodemailer optional and the `local`/`log` build resolvable everywhere (same container node_modules hoisting reason as the S3 driver). The reset-token TTL and the frontend reset URL are likewise config-driven (`app.passwordReset.ttlMinutes` / `.url`).

**What was rejected:**

- `@nestjs-modules/mailer` — heavier, template engine baked in; the thin transport facade matches the repo's hand-rolled infra style and the storage precedent.
- Static `import nodemailer` — forces the dep + breaks the in-container build (volume hoisting), exactly like the S3 driver case.
- Returning the reset token in the dev API response for testing — leaks tokens; grep the `log` transport output instead.

---

## 2026-06-06, Password reset flow — hashed single-use token, no enumeration

**What was decided:** `POST /auth/forgot-password` (always 200, uniform message) issues an opaque token, stores only its SHA-256 hash in a new `PasswordResetToken` model (one active per user, time-boxed), and emails `${PASSWORD_RESET_URL}?token=<raw>`. `POST /auth/reset-password` validates (exists, unused, unexpired) → sets the new password, marks the token `usedAt`, and **deletes all of the user's refresh tokens** in one `$transaction`. Both routes are `@Public()` + tight `@Throttle`. FE pages `/forgot-password` + `/reset-password` drive them via auth-store actions.

**Why:** Mirrors the existing refresh-token security model (store hash, never raw; reuse the `token.util` helpers). Uniform forgot-password response + swallowing mail-send errors prevents account enumeration. Revoking refresh tokens on reset forces every existing session to re-authenticate (standard post-reset hardening). Single-use + expiry verified in the e2e (reuse → 400, bogus → 400, unknown email → 200).

**What was rejected:**

- JWT-based reset tokens — can't be revoked/single-used without server state anyway, so an opaque DB token is simpler and safer.
- Keeping sessions alive after reset — leaves a thief's session valid; deleting refresh tokens is the safer default.

---

## 2026-06-06, Dev mail catcher — Mailpit in docker-compose, API defaults to SMTP

**What was decided:** Added a `mailpit` service to the dev `docker-compose.yml` (SMTP `1025`, web UI `8025`) and set the dockerized `api` service env to `MAIL_TRANSPORT=smtp` / `MAIL_SMTP_HOST=mailpit`. So the docker dev stack sends real SMTP to Mailpit (readable at http://localhost:8025), while non-docker/local runs keep the `log` default. Verified the full reset flow through Mailpit's REST API (email caught → token extracted from body → reset → login).

**Why:** Mailpit gives a real SMTP path + inbox UI with zero config, exercising the `smtp` transport (and confirming lazy nodemailer loads in-container) instead of only the `log` transport. Wiring it via compose api-env keeps it consistent with how DATABASE_URL/REDIS_HOST already point at docker service names — no `.env` editing needed.

**What was rejected:**

- Mailhog — unmaintained; Mailpit is its modern successor (better UI + REST API).
- Leaving dev on the `log` transport — never exercises real SMTP, so misconfig surfaces only in prod.

---

## 2026-06-06, Playwright E2E — live-stack, `*.e2e.ts`, hydration wait, Mailpit-driven

**What was decided:** E2E tests live in `apps/web/e2e/*.e2e.ts` (Playwright `testMatch: '**/*.e2e.ts'`) and run against the **already-running dev stack** (no `webServer`; baseURL `http://localhost:4300`, override via `E2E_BASE_URL`). Coverage: auth (redirect-when-unauthenticated, login ok/invalid, logout) + password reset (forgot confirmation, missing-token, and a full forgot→read-Mailpit→reset→login flow). Serial (`workers: 1`) since the reset spec mutates the seed admin; the spec restores `admin123` in a `finally`.

**Why:**

- `*.e2e.ts` naming keeps Playwright specs out of vitest's `**/*.{test,spec}.ts` glob (no config needed to separate the two runners).
- Three real gotchas were solved and are worth remembering:
  1. **Hydration race** — clicking a form submit before Nuxt hydrates fires a _native_ GET submit (page reloads to `/path?`), so the vee-validate handler never runs. Fixed with a `gotoHydrated()` helper that waits for `document.getElementById('__nuxt').__vue_app__` (Vue mount marker).
  2. **Selector collisions** — `getByLabel('Password')` also matches the "Show password" toggle (`aria-label`), and `getByRole('button', {name: /sign in/i})` matches the Google/X social buttons. Use `#password` and an anchored `/^sign in$/i`.
  3. **Rate limiting** — the `@Throttle` on auth routes (forgot-password 3/min) makes rapid/repeated E2E runs 429. Added a config-driven kill switch `THROTTLE_DISABLED` (ThrottlerModule `skipIf` reads `app.throttle.disabled`); the docker dev stack sets it true. Default stays false (prod-safe).
- Added `data-testid="user-menu-trigger"` / `"logout-button"` to `UserMenu.vue` — the menu has no stable accessible name otherwise.

**What was rejected:**

- A Playwright `webServer` that boots the app — the stack is multi-service docker; reusing the running stack is simpler and matches how the app actually runs.
- `networkidle` waits for hydration — the dev Vite HMR websocket never goes idle.
- Mocking the email — the Mailpit REST API (`/api/v1/messages`) gives a real, end-to-end reset assertion.

---

## 2026-06-06, Self-service registration — config-gated (resolves the admin-provisioned scope)

**What was decided:** Registration is now available but **off by default**, gated by `AUTH_REGISTRATION_ENABLED` (BE, `app.registration.enabled`) mirrored by `NUXT_PUBLIC_REGISTRATION_ENABLED` (FE). `POST /auth/register` 403s when disabled; new accounts get the **USER role only** and are auto-logged-in. FE: a `/register` page (shows a "disabled" notice when off) + a conditional "Sign up" link on /login. The docker dev stack turns both on via a single `REGISTRATION_ENABLED` compose var (default true). This **resolves** the earlier admin-provisioned scope decision rather than overriding it: the _default_ is still admin-only; deployers opt in.

**Why:** The user wanted sign-up but configurable — same pattern as `THROTTLE_DISABLED`. Default-off keeps the kit's original posture; the flag makes open signup a one-line opt-in. USER-role-only prevents privilege escalation via self-registration.

**What was rejected:**

- A public `GET /auth/config` endpoint to feed the FE flag — mirroring via runtime config (single `REGISTRATION_ENABLED` in compose) avoids a round-trip; the BE still enforces.
- Defaulting registration ON — would silently contradict the logged admin-provisioned scope.

---

## 2026-06-06, E2E expansion — register/users/profile, and the dev-server flakiness fixes

**What was decided:** Added `register.e2e.ts`, `users.e2e.ts`, `profile.e2e.ts` (13 specs total). Users CRUD uses the seed **super-admin** (`superadmin@nuxion.test` / `super1234`) — the seed `admin` is ADMIN-only and can't manage. Idempotent: tests restore the seed admin (name/avatar/password) and delete created users via API helpers (`deleteUserByEmail`, `patchMe`) in `finally`. Config hardened for dev-server runs: `retries: 1`, `expect` timeout 10s, test timeout 45s.

**Why — three patterns worth remembering:**

1. **Login race** — the `login()` helper clicks submit but doesn't wait for the result; a following hard `page.goto('/protected')` can fire before the refresh cookie is set, so the auth plugin restores nothing and the guard bounces to /login. Fix: `await expect(page).toHaveURL(/\/dashboard/)` after `login()` before any `goto`.
2. **Modal selectors** — `UserFormModal` inputs have no `for`/`id` label association (use `getByPlaceholder`); the confirm "Delete" button collides with the row's `title="Delete"` icon, so scope to the dialog: `page.getByRole('dialog').getByRole('button', {name: /^delete$/i})` (Modal is reka-ui → role="dialog").
3. **Dev-server flakiness** — first hit of a cold route can exceed a 5s assertion; `retries: 1` + generous timeouts make it reliably green (observed: occasional "flaky" that passes on retry). A production-build target would be steadier but is out of scope.

**What was rejected:**

- Asserting protected-route content right after `login()` without the dashboard wait — the source of the flakiness.
- Bumping per-route assertion timeouts individually — a global `expect.timeout` + retries is cleaner.

---

## 2026-06-06, i18n — @nuxtjs/i18n v10, no_prefix, EN default + ID

**What was decided:** `@nuxtjs/i18n` v10 with `strategy: 'no_prefix'` (locale in a cookie, URLs unchanged), `defaultLocale: 'en'` + `id`, lazy locale files at `apps/web/i18n/locales/{en,id}.json`, `detectBrowserLanguage` via cookie. A `LanguageSwitcher` (shell) in the auth layout + `AppHeader`. Converted auth pages (login/register/forgot/reset), `error.vue`, sidebar nav, and the user menu as the pattern; other strings migrate incrementally.

**Why:** `no_prefix` is the least invasive strategy — it keeps every existing route, the auth middleware, and the whole E2E suite intact (no `/id/` prefixes). Default English means the E2E assertions (English strings) keep passing unchanged; ID is opt-in via the switcher/cookie. Verified SSR honours the cookie (curl with `i18n_locale=id` → Indonesian) and an E2E test covers switch + persistence.

**What was rejected:**

- `prefix_except_default` (URL-prefixed locales) — better for public SEO but would change routes and break middleware/E2E; this kit is mostly an authed dashboard.
- Hand-rolled vue-i18n plugin — `@nuxtjs/i18n` is the idiomatic Nuxt choice (auto `$t`, SSR-safe, cookie detection).
- Translating BE error messages — kept English; the FE maps its own copy. (Caveat: `error.vue` renders in the default locale even with an `id` cookie — acceptable.)

---

## 2026-06-06, Registration invalidates the users-list cache + CRUD edit E2E

**What was decided:** `AuthService.register()` calls `usersService.invalidateList()` after creating the user (AuthModule now imports UsersModule; `invalidateList()` made public). Added an E2E for editing a user via the modal, completing CRUD coverage (List/Create/Edit/Delete).

**Why:** Registration creates the user via `prisma.user.create` directly, bypassing `UsersService` — so it didn't bump the `users:gen` cache counter, leaving the admin list stale for up to 30s (Redis TTL). Reusing `invalidateList()` keeps the list eventually-consistent immediately (verified: a fresh registrant appears in the cached list at once). AuthModule→UsersModule is a safe one-way dependency (UsersModule doesn't import auth; guards are global APP_GUARDs).

**What was rejected:**

- Duplicating the `users:gen` key + injecting RedisService into AuthService — reusing `UsersService.invalidateList()` (with its existing error-swallowing `safe()`) is cleaner than a shared magic-string constant.
- Routing registration through `UsersService.create()` — its return shape (`UserEntity`, roles as `string[]`) doesn't match `issueTokens`, and it has no clean duplicate-email path.

---

## 2026-06-06, DataTable `filters` slot + UserTable multi-select role filter (server-side)

**What was decided:** Added a `filters` named slot to the reusable `DataTable.vue` (toolbar above the table, rendered only when used). Added a **multi-select** role filter to `UserTable.vue` as tags/chips (All / Super Admin / Admin / User). The BE is the source of truth and filtering is fully **server-side**: `QueryUserDto.role` (single) became `roles?: UserRole[]` (a single query value is coerced to an array via `@Transform`), and `findAll` filters `where.roles = { some: { name: { in: query.roles } } }` (users holding ANY selected role). FE sends `?roles=A&roles=B`; `UserListParams.role` → `roles?: string[]`. E2E covers multi-select (Super Admin + Admin → both rows, the USER-only row filtered out).

**Why:** Per the user: multi-select with the BE as the single source of truth and server-side datatables — so the filter is computed by the API (no client-side filtering of a full dataset), using `in` for OR semantics. UserTable stays hand-rolled (not migrated to `DataTable`): `userColumns` lacks actions/avatar columns, so migrating would churn the passing users E2E for no user-visible gain; the `filters` slot keeps the reusable table filter-ready regardless.

**What was rejected:**

- Single-role / client-side filtering — the BE is the source of truth; filtering is server-side and supports multiple roles.
- Keeping the old `?role=` param — with `forbidNonWhitelisted` the renamed `roles` is the only accepted filter (old `?role=` now 400s).
- Migrating UserTable onto `DataTable` now — high churn (actions/avatar columns + E2E selectors) for no user-visible gain.

---

## 2026-06-06, Dev file storage — RustFS in docker-compose, S3 driver passthrough

**What was decided:** Added a `rustfs` service to the dev `docker-compose.yml` (`rustfs/rustfs:latest`, port 9000 API + 9001 console, named volume `rustfs_data`, runs as UID 10001). The `api` service now passes through all S3 env vars (`STORAGE_DRIVER`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `S3_REGION`, `S3_PUBLIC_BASE_URL`) with safe defaults pointing at the compose-internal `http://rustfs:9000`. `STORAGE_DRIVER` defaults to `local` so existing setups are unaffected. `api` depends_on `rustfs: service_started`. RustFS credentials are driven by the same `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` vars (default `rustfsadmin`/`rustfsadmin`). OrbStack domain fix: `CORS_ORIGIN` and `NUXT_PUBLIC_API_BASE` in compose now use `${VAR:-default}` so they can be overridden from `.env` (needed when the browser hits `https://web.nuxion-dev.orb.local` instead of `localhost`).

**Why:** The existing S3 driver (`s3.driver.ts`) already supports RustFS. Adding RustFS to compose completes the dev stack so devs can switch to `STORAGE_DRIVER=s3` with a single `.env` line. Named volume (not bind mount) avoids the UID 10001 chown requirement. `S3_PUBLIC_BASE_URL` defaults to `http://localhost:9000/nuxion` so the browser can access uploaded files directly (the S3 driver falls back to `endpoint/bucket/key` when no `publicBaseUrl` is set — that would embed the docker-internal hostname `rustfs` in URLs, which browsers can't reach).

**What was rejected:**

- Bind-mounting `/data` to a host path — requires `chown -R 10001:10001` on the host dir before first run; a named volume is zero-config.
- Making RustFS a Docker Compose profile — the service is lightweight; always-on keeps the dev stack consistent.
- Separate `S3_ACCESS_KEY`/`S3_SECRET_KEY` vars for RustFS — reusing `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` means the same `.env` values drive both RustFS at startup and the NestJS S3 driver, no duplication.

---

## 2026-06-07, S3 endpoint split — internal for ops, public for presign (fixes upload 500)

**What was decided:** The dockerized API must use the **internal** compose endpoint for S3 operations (`S3_ENDPOINT=http://rustfs:9000`), NOT the external OrbStack HTTPS domain. A `.env` that set `S3_ENDPOINT=https://rustfs.nuxion-dev.orb.local` made every `POST /files` upload fail with 500 (RustFS, reached through the orb HTTPS proxy from inside the container, errored), leaving the bucket empty. Presigned GET URLs, by contrast, are signed for the **public** endpoint (derived from `S3_PUBLIC_BASE_URL` by stripping the trailing `/<bucket>`) so the browser can reach them — generation is offline, so the API never has to reach that host.

**Why:** Container→RustFS traffic should stay on the internal docker network (`rustfs:9000`, plain HTTP, no TLS/proxy in the path) — same rationale as `DATABASE_URL=postgres:5432`. The orb HTTPS proxy in front of RustFS breaks in-container S3 PUTs. The two endpoints are intentionally separate: `S3_ENDPOINT` (server-side ops, internal) vs the presign endpoint (browser-side, public). Verified empirically: a presigned GET signed for `https://rustfs.…orb.local` (path-style) returns 200 through the proxy.

**What was rejected:**

- Pointing `S3_ENDPOINT` at the orb domain — the documented "obvious" choice, but it's the bug (in-container PUT → 500).
- Trusting the compose default blindly — the default IS `http://rustfs:9000`; the `.env` override is what broke it. Left a comment in `.env` to stop the footgun recurring.

---

## 2026-06-07, Avatars stay PRIVATE — cached presigned URLs behind a stable proxy

**What was decided:** With `STORAGE_DRIVER=s3` the bucket stays **private** (no anonymous-read policy). Objects are served via short-lived **presigned GET URLs** generated by the new `S3StorageDriver.signedUrl()` (`@aws-sdk/s3-request-presigner`, lazy-loaded like the client). `POST /files` no longer persists a bare object URL; it returns a **stable proxy URL** `GET /api/files/view?key=<key>` (built from the request's `x-forwarded-proto/host`). That endpoint is `@Public()` (so `<img>` works with no auth header) and uses `@Res()` to 302-redirect (bypassing the global `ResponseInterceptor`). `StorageService.displayUrl()` caches the presigned URL in Redis keyed by the object key (TTL = `STORAGE_SIGNED_URL_TTL_SECONDS` − 300s), so the temp URL is generated **once per window, not per request**; a new upload = new key = natural cache miss. The local driver is unaffected (`signedUrl` absent → falls back to the static `/uploads` URL; upload returns it directly, the proxy is never used).

**Why:** The user wanted private object storage but didn't want to regenerate a presigned URL on every read. A stable proxy URL keeps the stored `avatarUrl` non-expiring (no DB-stored temp URL to go stale, zero changes to the user/auth serialization layer or the FE — it still just stores `url` and binds `<img :src>`), while Redis caching keyed by the immutable object key satisfies "cache the URL if the file doesn't change." Verified end-to-end through the orb domains: upload → `PATCH /users/me` → read-back → `<img>` 302 → 200 `image/png`; three proxy hits returned an identical signature (cache hit), Redis key present with the expected TTL.

**What was rejected:**

- **Public-read policy** on the bucket (`mc anonymous set download`) — the simplest serve path, but the user explicitly wanted private.
- **Presigned URL stored in / resolved at the user serialization layer** (store the key, sign in `toEntity` + auth login) — broader blast radius (every user-returning endpoint, async `toEntity`) and the stored/payload URL expires; the stable proxy avoids both.
- **Streaming the bytes through the API** — truly private and no temp URL at all, but pushes every image through Node; presigned+redirect keeps RustFS serving the bytes.
- **A redirect cached for the full presign TTL** — kept `Cache-Control: private, max-age=60` (well under the TTL) so the browser doesn't pin a redirect to a URL that later expires.

> Gotchas: (1) `@aws-sdk/s3-request-presigner` is a separate package from `@aws-sdk/client-s3`; install it (the dev entrypoint runs `bun install --frozen-lockfile`, so update `bun.lock` via `bun add`, don't hand-edit `package.json`). (2) Avatars saved before this change (bare RustFS URLs, or local `/uploads` URLs) now 403/404 against the private s3 bucket — re-upload to refresh.

---

## 2026-06-07, Avatar must ride in the auth session payload (chrome + persistence)

**What was decided:** `SessionUser` (the `user` object in the `/auth/login`, `/auth/register`, `/auth/refresh` response) now includes `avatarUrl`. `UserMenu.vue` (the avatar in the header AND the sidebar footer) now renders `<img :src="auth.user.avatarUrl">` with the initials `<span>` as the `v-else` fallback.

**Why:** The upload→`PATCH /users/me`→display worked on the Profile card but the avatar **vanished on reload** and never appeared in the app chrome. Two FE-visible causes, both rooted in the auth payload: (a) `UserMenu` only ever rendered initials; (b) `useMe()` seeds its data from `auth.user` (`initialData`) and, because the app has a non-zero query `staleTime`, it does **not** refetch `/users/me` on mount — so the card shows whatever `auth.user` holds. `auth.user` is populated from `/auth/login`+`/auth/refresh`, whose `SessionUser` was `{id,email,name,roles}` — no `avatarUrl`. So on every reload the in-memory user lost its avatar. Adding `avatarUrl` to `SessionUser` fixes both the card (via `initialData`) and the chrome (UserMenu) in one place; all three auth flows already `include: { roles: true }` (full user row, `avatarUrl` present), so only `issueTokens()` needed to pass it through. The FE needed no type change — the Pinia store already types `user` as the shared `User` (which has `avatarUrl`). Verified in a real browser: after a hard reload (→ `/auth/refresh`, not a fresh upload) the photo shows on the card, header, and sidebar and persists.

**What was rejected:**

- Forcing `useMe()` to always refetch `/users/me` on mount — treats the symptom; the session user should carry its own avatar anyway (the chrome reads `auth.user`, never `/users/me`).
- Rendering the avatar only on the Profile card — the header/sidebar are where users actually look; initials-only there reads as "the upload didn't work."

> Gotcha: `nest start --watch` does NOT pick up edits over the macOS Docker bind mount (no inotify events cross the boundary) — restart the api container (`docker compose restart api`) after BE source changes, or the running code stays stale. (The web/Nuxt side polls via `NUXT_DEV_POLLING=true`, so it HMRs fine.)

---

## 2026-09-02, Web redesign follows the Polygon design system via token-extension, not rewrite

**id:** `01a060b5-58af-7218-a8ba-93ed378ef878`

**What was decided:** The web app (admin shell + auth + landing) adopts the Polygon design language (polygon.tabalongkab.go.id) by extending the existing `--ina-*` → semantic → `@theme` pipeline in `apps/web/app/assets/css/main.css`: adds `--sidebar-*` (white surface, #eff5fd active tint), `--success/--warning/--info`, `--chart-1..5`, `--popover`, `--shadow-card`, navy/mint landing surfaces — each with Polygon's dark-mode values.

**Why:** Polygon's palette IS the IDDS/inagov values this repo already ships (primary #0956c3, bg #f8f8f7, ink #1f1f1f, border #e5e5e5, destructive #f02d2d, success #288034, dark bg #141414 / primary #196bcd), so extending tokens keeps dark mode, `[data-brand]` switching, and chart token-tracking (`useChartTokens`) working for free. PR #24.

**What was rejected:**

- Dropping `@idds/styles` and hardcoding Polygon vars — touches 37 `brand-*` + 14 `success/error-*` call sites, loses brand switching, bigger diff for zero visual gain.
- Rebuilding components from Polygon's compiled CSS — the 6 hand-rolled shadcn-style primitives only needed token swaps (314 semantic-utility usages vs 9 raw hex colors in the app).

---

## 2026-09-02, Typography: Poppins headings (Semi-Bold) + Google Sans body (Regular)

**id:** `01a060b5-58b4-7b18-8a8b-445413919a11`

**What was decided:** Headings use **Poppins** at weight 600 (Semi-Bold; 700 allowed for display values like KPI numbers), body uses **Google Sans** at 400 (Regular). The heading rule is global in `main.css` (`h1–h6` + `[data-slot='card-title']`); fonts load from the single Google Fonts URL in `nuxt.config.ts`. Text contrast must meet WCAG ≥ 4.5:1 against its background.

**Why:** Public-portal character — close to the people, flexible, inclusive; round, non-rigid letterforms suit government services; matches Polygon 1:1.

**What was rejected:**

- Noto Sans (the globally-complete alternative) — breaks parity with the Polygon reference.
- Inter (IDDS's default) — fully removed: head link swapped, `@idds/styles`'s Google-Fonts `@import` stripped via `bun patch` (patches/@idds%2Fstyles@1.6.32.patch), and `body { font-family }` re-declared in main.css because the package's reset sets `font-family: 'Inter'` directly on `<body>` — a direct declaration beats inheritance from `<html>` regardless of import order (this is why admin pages still showed Inter after the first pass).

---

## 2026-09-02, Input metrics normalized to Polygon's recipe exactly

**id:** `01a060b5-58b4-7d28-9b99-14ae37d2d450`

**What was decided:** Every input surface uses Polygon's exact recipe: `h-9 · rounded-lg · border-input · bg-background · px-3 · text-sm · placeholder:text-muted-foreground/50 · focus:border-ring + ring-ring/20` (textarea keeps `min-h` sizing — no textarea exists in the Polygon reference to copy).

**Why:** The app read "bigger than Polygon"; the audit found h-11 + px-4 + shadow on the user form modal, h-10 on the users search, and `rounded-md` + `shadow-sm` + old focus patterns on the generic Input/Date/File/TagInput fields. Source of truth = the input markup extracted from the Polygon reference HTML.

**What was rejected:**

- Keeping TailAdmin-era sizes with color retints only — visual mismatch persisted.
- A shared `inputClass` constant — after normalization only one call site (UserFormModal) needed custom classes; DRY is better served by the component + token layer.

---

## 2026-09-02, Dependency upgrades: minors/patches via Dependabot, majors held behind ignore rules

**id:** `01a060b5-58b4-73e2-8a99-ebdabb22cb24`

**What was decided:** Dependabot #22 merged with nine majors held on the PR branch (typescript 7, @nestjs/* 12, jest 30, @tanstack/vue-table 9, pinia 4 + vue-router 5 + @pinia/nuxt 1, vue-sonner 2, zod 4, apexcharts 7); `ignore: update-types: ["version-update:semver-major"]` rules for those packages now live in `.github/dependabot.yml` so weekly groups keep proposing minors/patches only. Remove an ignore entry when starting that migration.

**Why:** Each held major needs a real migration, not a lockfile bump (TS 7 removes `moduleResolution: node10` + `baseUrl` + the JS compiler API ts-jest/vue-tsc/typescript-eslint need; Nest 12 is ESM-only and breaks the jest CJS transform; pinia 4 / router 5 pair with a Nuxt 4.5 bump; vue-sonner 2 becomes a Nuxt module; zod 4 blocked by `@vee-validate/zod` peer ^3.24).

**What was rejected:**

- Merging #22 as-is — breaks build/test on main.
- `@dependabot ignore` comments — closes the current PR and stalls the whole group until next week's run.

---

## 2026-09-02, Standing workflow rules

**id:** `01a060b5-58b5-740f-a88b-39c04824371b`

**What was decided:** (1) Read MEMORY.md at session start; entries get UUID v7 ids; never contradict a logged decision without flagging. (2) Check ERRORS.md before suggesting approaches; log anything that took >2 attempts. (3) End every coding task with a short status block (files changed / modified / intentionally untouched / follow-up). (4) Never commit/push unless explicitly told. (5) DRY — always consider making/using reusable components. (6) Check and avoid N+1 queries.

**Why:** Explicit user directive (2026-09-02).

**What was rejected:** None — directive.

---

## 2026-09-02, Form controls follow shadcn-vue's official sources on reka-ui primitives

**id:** `01a060c2-f27e-75dc-81db-6bbb9f931561`

**What was decided:** Every form control is a hand-rolled shadcn-vue component in `apps/web/app/components/ui/` mirroring the **official shadcn-vue source** (new-york-v4 registry): `data-slot` attributes, `useForwardPropsEmits` prop forwarding, `aria-invalid` variants, and the official class strings — adapted only where the repo lacks the dependency (e.g. Checkbox's `reactiveOmit` from @vueuse/core is replaced by Vue 3.5 reactive props rest-spread) or where our Polygon input recipe applies. New `ui/Checkbox.vue` added this way; `CheckboxField` now composes it; the last two native `<input type="checkbox">` (UserFormModal role toggles, login keep-logged-in) were replaced. Binding at call sites is `v-model:checked` / `:checked` + `@update:checked` (reka-ui contract), not `v-model`.

**Why:** Native checkboxes rendered unstyled off-system (TailAdmin leftovers with old `brand-*` focus classes); the shadcn-vue docs URL was given as the reference by the user. Zero native checkboxes remain (verified in-browser: `input[type=checkbox]` count = 0 on /users modal and /login).

**What was rejected:**

- Keeping `CheckboxField`'s inline `CheckboxRoot` styling — duplicated the primitive's classes; extracting `ui/Checkbox.vue` keeps DRY (one source of truth, like Button/Card/Badge).
- Adding `@vueuse/core` just for `reactiveOmit` — one-line Vue 3.5 rest-spread does the same without a new dependency.

---

## 2026-09-02, NestJS 12 adopted with vitest; TypeScript 7 verified NOT supported and declined

**id:** `01a06102-9d06-7ed4-8461-5a44f814119e`

**What was decided:** API upgraded to `@nestjs/*` 12 (whole family, incl. cli/schematics/testing; config 4→12) and the test runner migrated Jest→**Vitest** (`vitest.config.ts` + `test/vitest.e2e.config.ts`, explicit `import { describe… } from 'vitest'` per spec, tsconfig `types` untouched, `vite-tsconfig-paths` NOT added — aliases inlined in the two configs). jest/ts-jest/@types/jest removed; `@nestjs/*` + jest ignore entries dropped from dependabot.yml. **TypeScript stays ^5.7.2**: TS 7 was researched and rejected — 7.0 ships no compiler API (nest build/CLI need it; new API expected in 7.1) and vue-tsc/typescript-eslint still require TS 5/6 (peer `<6.1`). This _extends_, not contradicts, the earlier TS-hold decision: the hold on @nestjs/* was lifted by completing its migration PR as the playbook prescribed. Known wrinkle kept: `@nestjs/throttler` 6.5.0 peers only ^11 (no Nest-12 release yet) — runtime-verified fine, expect a peer warning until throttler ships an update.

**Why:** NestJS 12 packages are ESM-only; Jest's CJS module runtime cannot load them (verified: suite failed with "Must use import to load ES Module" — Bun's require(esm) doesn't help because Jest hijacks module loading). Vitest is the path NestJS 12's own migration guide pushes for ESM projects and was already in the workspace (web). Verified: 40/40 tests green in ~1s (jest: 2.7s), all workspace gates green, container runtime on @nestjs/core 12.0.1 serving health+login 200.

**What was rejected:**

- Jest ESM mode (ts-jest ESM presets) — experimental, forces `.js` extensions on relative imports across the app.
- TS 7 / tsgo side-by-side for typecheck only — out of scope for this PR; TS 6 remains the stepping stone when wanted (playbook in the 2026-09-02 dependency decision above).
- `vite-tsconfig-paths` — one more devDep for 6 aliases that two config files already encode.

---

## 2026-09-08, Web UI migrated from Polygon/IDDS to Material Design 3 (full overhaul)

**id:** `01a07eac-6827-79aa-bbd6-b993e4d16b5e0`

**What was decided:** `apps/web` restyled to Material Design 3, token-first. `main.css` was rewritten as the single MD3 source of truth: the canonical baseline scheme (seed #6750A4, light + dark, every role from primary/on-primary to surface-container-lowest..highest, outline, inverse, scrim) published as Tailwind v4 utilities (`bg-surface-container-high`, `text-on-surface-variant`, `border-outline-variant`), with the previous shadcn semantic contract (bg-card, text-muted-foreground, border-border...) kept as a bridge mapped onto MD3 roles so legacy call sites resolve without edits. Shape scale (4/8/12/16/28dp), MD3 elevation shadows (cards sit flat, tonal not shadow; --shadow-card is transparent), emphasized motion easings, and text tokens pulled to MD3 steps (xl=22/28 title-large, 2xl=28/36 headline-medium) all live in the same file. Components follow MD3 anatomy: filled/tonal/outlined/text buttons are 32/40/48dp pills with on-color state layers, text fields are 4dp-corner outlined (focus = 2dp primary), switch is 52x32 with outline thumb, checkbox 18dp/2dp radius, cards outlined 12dp, dialogs 28dp on surface-container-high with plain scrim (no blur), sidebar is an MD3 navigation drawer (active = secondary-container full pill, no left stripe; rail 80dp), header is a top app bar (surface at rest, tonal + level-2 shadow on scroll) with an MD3 search-bar pill, role filters are MD3 filter chips (leading check), vue-sonner is themed as an MD3 snackbar (inverse-surface, `.md3-snackbar` in main.css, position bottom-right). Icons moved lucide-vue-next -> Material Symbols Outlined via a ligature `<MaterialSymbol>` component (`components/common/`, props name/size/fill; font loaded in nuxt.config with display=block to avoid raw-name flash). Landing hero and auth brand panel switched from navy+orbs+grid to MD3 tonal surfaces (primary-container; tertiary-container logo tile as the single accent). Typography deliberately NOT converted: Poppins headings + Google Sans body stay (standing rule), only the scale follows MD3.

**Why:** the user requested a full MD3 refactor and chose (via explicit Q&A) full overhaul depth, baseline purple seed, hybrid fonts/icons, and antislop applied during the work. The token-first strategy (MD3 roles + shadcn bridge in one CSS file) meant ~90% of the restyle flowed through variables while only component anatomy needed class edits. Dropping `@idds/styles` (and its root patch + `data-brand` attr + lucide) removes two dependencies the new token layer fully replaces; charts keep following theme automatically because `useChartTokens` still reads the same six CSS vars (only its SSR fallbacks changed).

**What was rejected:**

- `@material/web` components — maintenance mode, no M3 Expressive, and Web Components are SSR-hostile under Nuxt; existing reka-ui primitives + Tailwind cover the same anatomy.
- Keeping the IDDS import "just in case" — zero direct `--ina-*` usage existed in app code (verified by grep before removal).
- Roboto Flex as part of a "full MD3" conversion — the user picked the hybrid: fonts stay Poppins/Google Sans, only the type scale follows MD3.
- Supersedes the 2026-09-02 Polygon token-extension decision; the IDDS/Polygon entries above remain as history.

---

## 2026-09-08, Color scheme switched from MD3 baseline purple to Material Lime seed

**id:** `01a07f2e-2ef1-7a4d-a92d-d3da301d82d7`

**What was decided:** the MD3 scheme in `apps/web/app/assets/css/main.css` was regenerated from seed **#CDDC39 (Material Lime 500)**, variant TonalSpot (Material Theme Builder default), standard contrast — replacing the hardcoded baseline purple (#6750A4) blocks. Values are produced by the new committed generator `apps/web/scripts/generate-md3-tokens.ts` (`bun apps/web/scripts/generate-md3-tokens.ts [seed]`, devDependency `@material/material-color-utilities`), so any future re-seed is a one-command regeneration + paste. Nothing else changed structurally: the shadcn bridge, status trio (success/warning/info, AA-checked on the lime-tinted neutrals), chart palette (role-referenced; only `useChartTokens` SSR fallbacks updated), sidebar contract (surface-container), and all component anatomy stay as-is — the whole app recolors through the token layer.

**Why:** the user asked for a "lime material design" palette; generating with the official HCT utilities (per the material-3 skill) keeps every tonal pair WCAG-AA by construction instead of hand-picking hexes.

**What was rejected:**

- Hand-picking lime hexes per role — breaks pairing contrast guarantees and drifts from Material Theme Builder output.
- Hardcoding again without a generator — the previous baseline was a published constant (fine to hardcode), but a custom seed needs a reproducible path.

---

## 2026-09-08, Landing page expanded with real Bun install instructions

**id:** `01a07fb0-53a0-7ae6-88b2-478963ce5de1`

**What was decided:** `apps/web/app/pages/index.vue` became a complete landing: hero + secondary anchor CTA scrolling to an `#install` band (`bg-surface-container`) with two copy-button blocks — the scaffolder one-liner `bun create mk-nestnuxtmonorepo@latest my-app` and the 5-step clone path (bun install / bun run init / docker compose up -d postgres redis / prisma generate + deploy + db:seed / bun run serve) — followed by five "What's inside" cards (auth & RBAC, datatable, 30+ M3 components, shared types, Docker dev stack) and a 14-badge stack strip. All copy is i18n'd (`home.installCta`, `home.install.*`, `home.inside.*`, `home.stackTitle`, `home.copy/copied`; en + id). The install commands mirror the README verbatim — README stays the single source of truth; the landing must be updated whenever those steps change.

**Why:** the user asked for a fuller landing that teaches installation with Bun on the front page; quoting the actual commands (and the actual scaffolder CLI from f6bcf4a) keeps the page honest per antislop rules instead of shipping invented or marketing-fluff steps.

**What was rejected:**

- Paraphrasing/guessing install steps or generic "Get started" copy — would drift from the README and silently break after doc changes.
- Linking to docs instead of inlining commands — the user explicitly wanted the instructions on the front page itself.
- `lg:min-w-0` on the code-block grid child — a `<pre>`'s min-content width expands the grid track at mobile widths (64px horizontal overflow at 375px); only unconditional `min-w-0` fixed it.
