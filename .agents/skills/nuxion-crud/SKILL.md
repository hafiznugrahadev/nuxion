---
name: nuxion-crud
description: Codifies Nuxion's canonical full-stack CRUD pattern — NestJS API module (Drizzle + explicit repository + BaseQueryDto) plus Nuxt admin feature slice (TanStack Query + ui/Table + Modal/Sheet) — extracted from the users module. Use whenever adding or changing any CRUD resource in this monorepo: new API module, endpoint, DTO, admin list page, datatable, create/edit modal, filters, or pagination — even when only one side (API or web) is touched, and when reviewing CRUD code for consistency.
---

# nuxion-crud

One recipe for every CRUD feature in this monorepo. The `users` module is the
canonical implementation on both sides — when this skill and the code disagree,
**the code wins**; update this skill in the same PR that changes the pattern.

## When to Use This Skill

Use this skill when the task involves:

- Adding a new resource ("products", "articles", "invoices", …) end-to-end or on
  one side only (API module or admin web page).
- Adding endpoints, DTOs, pagination, filters, sorting, or search to an existing
  module.
- Building an admin list page: datatable, toolbar, search box, filter panel,
  create/edit modal, delete confirmation.
- Reviewing a CRUD PR for architectural consistency.

Do NOT use it for: auth/session flows (`modules/auth`), public landing pages
(SSR), or one-off pages without server data.

## Architecture at a Glance

```
apps/api (NestJS + Drizzle + PostgreSQL)         apps/web (Nuxt 4 admin SPA)
  modules/<feature>/                               app/features/<feature>/
    <feature>.controller.ts   routes, roles          api/<feature>.api.ts      fetchers
    <feature>.service.ts      business logic         composables/use<Feature>  query/mutations
    <feature>.repository.ts   only Drizzle layer     components/<Feature>Table table + toolbar
    entities/, dto/            response + input      components/<Feature>FormModal
                                                  schemas/  zod, types.ts, index.ts barrel
                                                  pages/admin/<feature>/index.vue  (thin)
packages/shared-types  ← User, UserRole, ApiResponse, Paginated — the shared contract
```

Request path: `UserTable` → `useUsers` → `userApi.list` → `useApi()` (adds Bearer
token, transparent 401→refresh→replay) → NestJS controller → service
→ repository (`@InjectDrizzle()` query builder). Response envelope `{ success, data, meta }`
is unwrapped by `unwrapPaginated` into `{ data, meta }`.

## Hard Contracts

These are non-negotiable. Each exists because skipping it caused a real bug or
review round-trip.

### API (apps/api)

| Contract                                                                                                                                                  | Why                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Envelope `{ success: true, data, meta? }`; errors `{ success: false, statusCode, message, error, path, timestamp }`                                       | `ResponseInterceptor` + `AllExceptionsFilter` are global — never shape responses by hand |
| Query params are `page`, `limit` (max 100), `search`, `order` (`asc`\|`desc`), `sortBy`                                                                   | NOT `perPage`/`sortDir`/`q` — mirrors `BaseQueryDto`                                     |
| Every feature QueryDto **overrides `sortBy` with an `@IsIn(SORTABLE_FIELDS)` whitelist**                                                                  | An unknown column (e.g. a relation) must be a 400, not a database 500 from `orderBy`     |
| The repository is the **only** layer that touches the database; it injects Drizzle via `@InjectDrizzle()` and writes explicit queries                     | Query syntax stays in one auditable place                                                |
| Secrets are excluded at the repository level (explicit column `select`, never a bare `select()` on the whole table)                                       | The hash must never reach a service, entity, or response                                 |
| Roles: reads `@Roles(ADMIN, SUPER_ADMIN)`, writes `@Roles(SUPER_ADMIN)`; guards are global (`APP_GUARD`), `@Public()` opts out; `@Roles` is ANY-semantics | Secure by default; controllers declare policy, not mechanics                             |
| Literal routes (`me`) declared **before** `:id`; `ParseUUIDPipe` on `:id`; `@HttpCode(HttpStatus.OK)` on DELETE                                           | Otherwise "me" is captured as a UUID and malformed ids 500                               |
| Entities extend `BaseEntity` and define the response shape — never return raw database rows                                                               | Swagger stays honest; API contract is deliberate                                         |
| Unique columns use `@IsUnique({ model, column })` (model → table registry in the validator)                                                               | 409 with a readable message instead of a raw pg 23505 leaking                            |
| Tests are **vitest**: unit spec per service (`vi.fn()` mocks), e2e via `createTestApp()` + `SEED_USERS` + `E2E_PREFIX`                                    | Supertest against the real pipeline catches guard/validation regressions                 |

### Web (apps/web)

| Contract                                                                                                                                                                                                                                    | Why                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Feature code lives in `app/features/<feature>/` and is imported **explicitly via its `index.ts` barrel** — `features/` is NOT auto-imported                                                                                                 | The dependency rule that keeps features from reaching into each other                       |
| Entity data goes through TanStack Query only: `usePaginatedQuery` (list) + `useApiMutation` (write). **No per-entity Pinia store, no Nitro/server API routes**                                                                              | Pinia is for session/shell only; the API stays in NestJS                                    |
| `ui/Table.vue` is a pure view: props `columns/rows/rowKey/sort`, emits `update:sort`, never reorders rows itself. Bind `:sort` back so the arrow mirrors the API defaults (`createdAt`/`desc`)                                              | The API is the source of truth; the table only reports clicks (`aria-sort` included)        |
| Only columns the API whitelist allows get `sortable: true`; `onSort` resets `page = 1`                                                                                                                                                      | Relations cannot be `orderBy`'d; page 1 of a new sort must not 404                          |
| States render in order: `ErrorState` (with `@retry`) → `LoadingState` → `EmptyState` → table inside `<Card class="overflow-hidden">`                                                                                                        | One loading/empty/error vocabulary across the app                                           |
| Create + edit share **one Modal** (`v-model:open`), schema switched by mode, re-seeded via `resetForm` on `watch([open, user?.id])`; immutable fields render disabled; optional-when-editing fields (password) are sent only when non-empty | Half the code, consistent a11y and transitions                                              |
| Deletes go through `await confirm({ ..., destructive: true })` from `useConfirm()`; the `mutateAsync` call site wraps in try/catch with an **empty catch**                                                                                  | Toasts/errors are handled centrally by `useApiMutation`                                     |
| Forms: vee-validate + zod via `toTypedSchema`; the FE zod schema mirrors the BE class-validator DTO                                                                                                                                         | One validation message vocabulary; server 400s back up the client                           |
| All user-visible strings go through `t()` with **full en/id key parity** in `apps/web/i18n/locales/`                                                                                                                                        | `no_prefix` strategy, two locales, zero hardcoded English                                   |
| Filters live in a right-side `Sheet`, apply **server-side on every toggle**, reset `page = 1`; trigger button shows the active-filter count badge                                                                                           | The list endpoint is the single source of truth                                             |
| Search inputs debounce the value that feeds the query (`refDebounced(search, 400)` — raw ref on `v-model`, debounced ref in params) and reset `page = 1` on change                                                                          | One request per typing pause, not per keystroke — the list endpoint is not a typeahead      |
| reka-ui `*Content` components must sit inside their `*Portal` wrapper                                                                                                                                                                       | Inline content bleeds under later positioned siblings; `z-50` cannot fix a stacking context |
| Elevation = MD3 surface containers (`surface-container-low/high`), never shadows; text uses `on-surface*` roles; icon buttons get `touch-target` + `aria-label`/`title`                                                                     | Themeable MD3 system shared with the design language                                        |
| WCAG AA ≥ 4.5:1 in **both** light and dark themes after any color change — measure computed styles, don't eyeball                                                                                                                           | Project quality bar                                                                         |

### Cross-cutting

- `main` is protected: work on a feature branch, open a PR, squash-merge.
  Commit subjects follow commitlint (`feat|fix|chore|refactor|docs|test|build|ci|perf|style|revert(scope): …`).
- New table → add it to `apps/api/src/db/schema.ts`, then
  `bun run --filter @nuxion/api db:generate` (author the SQL migration) +
  `db:migrate` (apply). Seed data goes in `apps/api/src/db/seed.ts` and must be
  idempotent (`onConflictDoNothing`/`onConflictDoUpdate`).
- Shared types (`User`, enums, `ApiResponse`, `Paginated`) live in
  `packages/shared-types` — add cross-boundary types there, not duplicated.

## Workflow

1. **Read the canonical example before writing anything.** API side:
   `apps/api/src/modules/users/` (controller, service, repository, module,
   `entities/`, `dto/`). Web side: `apps/web/app/features/user/` (all six files)
   and `apps/web/app/pages/admin/users/index.vue`. They answer most style
   questions by example.
2. **API first.** Follow [references/api.md](references/api.md): schema table →
   generate migration → entity → DTOs (with the `sortBy` whitelist) → repository → service
   → controller → module → register in `app.module.ts` → unit spec (+ e2e spec
   for anything beyond CRUD).
3. **Then the web slice.** Follow [references/web.md](references/web.md):
   `types.ts` + zod schema → `api/` fetchers → `composables/` (query +
   mutations) → `components/` (Table + FormModal) → barrel → thin page under
   `pages/admin/<feature>/` → sidebar entry → i18n keys (en **and** id).
4. **Run the verification gates** (below). Fix what fails before committing.
5. **Deliver**: branch, commitlint-clean commits, PR with a short rationale.

## Verification Gates

Run through these before opening the PR — they are cheap and each catches a
class of bug this project has actually hit:

- [ ] API: `bun run --filter @nuxion/api test` green; new service has a spec;
      e2e spec written against `createTestApp()`.
- [ ] API: `?sortBy=<non-whitelisted>` returns **400**, not 500.
- [ ] API: unknown body fields rejected (global `ValidationPipe`
      `forbidNonWhitelisted`); secret columns absent from every response shape.
- [ ] Web: sort arrow on first load reflects the API default; clicking a sort
      header resets to page 1.
- [ ] Web: create/edit modal re-seeds correctly when opened twice in a row
      (create → close → edit a different row).
- [ ] Web: en/id JSON key parity (diff the flattened key sets — one-liner in
      references/web.md); no hardcoded user-facing strings.
- [ ] Web: no new Nitro route, no new per-entity Pinia store, feature imported
      only via its barrel.
- [ ] Any color/token change: contrast probed in both themes (≥ 4.5:1).
- [ ] Skill itself still matches the code — if the pattern changed, update this
      skill in the same PR.

## Anti-Patterns

These have all appeared in this repo and been reverted — do not reintroduce:

- **`<DataTable />` / `@tanstack/vue-table`** — prescribed by an old SPEC draft,
  never shipped. The real table is `app/components/ui/Table.vue` (hand-rolled,
  emit-only sort); SPEC.md's "Generic Table" section documents it.
- **A Pinia store per entity** (`stores/users.ts`) or server data fetched via
  `useFetch` in admin pages — entity data belongs to TanStack Query.
- **Nitro/server API routes in apps/web** — the API stays in NestJS; the web app
  only calls it.
- **Inline reka-ui `*Content` without `*Portal`** — the popover/select will
  render under later positioned siblings.
- **Client-side filtering/sorting of paginated lists** — refetch with params
  instead; the API is the source of truth.
- **Hardcoded English strings** (toasts, confirm fallbacks, placeholders) — use
  `t()` with en/id keys.
- **Skipping the `sortBy` whitelist** "because the FE only sends valid values" —
  the API is a public surface; FE types are not enforcement.
- **Trust FE-only RBAC** — hiding buttons with `canManage` is UX, not security;
  every privileged route needs `@Roles` on the controller.
- **Shadow-based elevation on dialogs/sheets** — MD3 uses surface-container
  tiers here.
- **Per-feature `$fetch` setups** — always go through `useApi()` /
  `lib/api-client.ts` (auth header, envelope unwrap, 401 refresh-replay).

## Known Environment Notes

- Dev stack runs in OrbStack: web at `https://web.nuxion-dev.orb.local/`, API at
  `https://api.nuxion-dev.orb.local/api`. `nest --watch` never reloads env —
  `docker restart nuxion-api-dev` after config changes.
- `apps/web` typecheck crashes on clean `main` (pre-existing, unrelated to most
  changes) — don't gate on it; the API typecheck is reliable.
- Seed users: `superadmin@nuxion.test`/`super1234`, `admin@nuxion.test`/`admin123`,
  `user@nuxion.test`/`user1234` + 100 demo users (`demo.NNN@nuxion.test`/`demo1234`).
  After out-of-band DB writes, bump `users:gen` in Redis or the list cache
  serves stale data for ≤ 30 s.

## Reference Documents

- [references/api.md](references/api.md) — file-by-file backend recipe with real
  excerpts from the users module: Drizzle schema conventions, DTO patterns (the
  `sortBy` whitelist, array filters, `IsUnique`), repository/service/controller
  anatomy, module registration, seeding, unit + e2e testing recipes.
- [references/web.md](references/web.md) — file-by-file frontend recipe: feature
  slice layout, fetcher/composable wiring, Table + toolbar + Sheet filter +
  pagination anatomy, FormModal pattern, i18n key template (copy this tree for
  a new feature), theming and a11y conventions, the i18n parity one-liner.
