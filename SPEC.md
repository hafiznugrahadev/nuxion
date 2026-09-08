# Project Structure Guide

> Panduan struktur folder + tech stack untuk new project. Berlaku sebagai konvensi tim.
> **Prinsip utama: DRY (Don't Repeat Yourself).** Setiap pola yang muncul ≥ 2 kali → angkat jadi abstraksi.

---

## Tech Stack Overview

<aside>
💡

sebelum implementasi tech stack wajib tanya saya terlebih dahulu pada plan mode. tanyakan juga initial project monorepo atau tidak dan share types ts atau tidak

</aside>

### Backend

| Kategori         | Pilihan                                     | Catatan                                                                         |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------- |
| Runtime          | **Bun** / Node.js LTS                       | Bun untuk greenfield, Node untuk legacy                                         |
| Framework        | **NestJS**                                  | Modular, DI, decorator-based                                                    |
| ORM              | **Prisma**                                  | Type-safe, auto-migration                                                       |
| Database (SQL)   | **PostgreSQL**                              | Default untuk transactional                                                     |
| Database (NoSQL) | **MongoDB** (Mongoose)                      | Hanya jika benar-benar butuh document-store                                     |
| Cache / Queue    | **Redis** + BullMQ                          | Cache, rate-limit, background jobs                                              |
| Object Storage   | **MinIO** / **RustFS** / S3                 | File upload, asset storage                                                      |
| Auth             | **OAuth2 Client Credentials** + JWT         | Service-to-service & user auth                                                  |
| **Validation**   | **class-validator** + **class-transformer** | **Standar NestJS. Jangan pakai Zod di BE — pecah pattern decorator-based.**     |
| Mapped Types     | **@nestjs/mapped-types**                    | `PartialType`, `PickType`, `OmitType`, `IntersectionType` — kunci DRY untuk DTO |
| Logging          | **Pino** (`nestjs-pino`)                    | Fast, structured JSON logs                                                      |
| API Docs         | **Swagger** (`@nestjs/swagger`)             | Auto-generated dari decorator                                                   |
| Testing          | **Jest** + Supertest                        | Unit + e2e                                                                      |
| APP Ports        | configurable via .env                       |                                                                                 |

### Frontend

| Kategori       | Pilihan                                           | Catatan                       |
| -------------- | ------------------------------------------------- | ----------------------------- |
| Framework      | **Next.js** (App Router)                          | React 19, RSC                 |
| Language       | **TypeScript**                                    | Strict mode                   |
| Styling        | **Tailwind CSS**                                  | Utility-first                 |
| UI Primitives  | **shadcn/ui** (Radix)                             | Copy-paste, fully ownable     |
| Forms          | **react-hook-form** + **Zod**                     | Zod **hanya** untuk FE schema |
| Data Fetching  | **TanStack Query**                                | Server state                  |
| Tables         | **TanStack Table**                                | Headless, fully customizable  |
| State (client) | **Zustand**                                       | Ringan, simpel                |
| HTTP Client    | **Axios** / **ky**                                | Pilih satu, konsisten         |
| Icons          | **Lucide React**                                  | Konsisten dengan shadcn       |
| Date           | **date-fns** / **Day.js**                         | Hindari moment.js             |
| Notifications  | **Sonner**                                        | Toast modern                  |
| Testing        | **Vitest** + **Testing Library** + **Playwright** | Unit + integration + e2e      |
| APP Ports      | configurable via .env                             | not exposed in compose        |

### DevOps & Tooling

| Kategori           | Pilihan                                                     |
| ------------------ | ----------------------------------------------------------- |
| Container          | **Docker** + **Docker Compose**                             |
| Deploy             | **Dokploy** (self-hosted, atur next js agar optimal di vps) |
| Reverse Proxy      | **Traefik** / Nginx                                         |
| CDN / WAF          | **Cloudflare**                                              |
| Monitoring         | **Zabbix** (infra) + **Sentry** (app)                       |
| CI/CD              | **GitHub Actions**                                          |
| Linter / Formatter | **ESLint** + **Prettier** + **Biome** (opsional)            |
| Git Hooks          | **Husky** + **lint-staged**                                 |
| Commits            | **Conventional Commits** + **Commitlint**                   |

---

## Backend (BE) Structure

```
src/
├── modules/
│   └── <feature>/
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── <feature>.repository.ts
│       ├── <feature>.module.ts
│       ├── dto/
│       │   ├── create-<feature>.dto.ts
│       │   ├── update-<feature>.dto.ts    ← extends PartialType(CreateDto)
│       │   └── query-<feature>.dto.ts     ← extends BaseQueryDto
│       ├── entities/
│       │   └── <feature>.entity.ts        ← extends BaseEntity
│       └── tests/
│
├── common/
│   ├── dto/                               ← ⭐ Shared DTOs (BaseQueryDto, PaginationDto)
│   ├── entities/                          ← ⭐ BaseEntity (id, timestamps)
│   ├── repositories/                      ← ⭐ BaseRepository<T>
│   ├── services/                          ← ⭐ BaseCrudService<T>
│   ├── filters/                           ← Exception filters
│   ├── guards/                            ← Auth, roles, permissions
│   ├── interceptors/                      ← ResponseTransform, Logging, Cache
│   ├── decorators/                        ← @CurrentUser, @Roles, @ApiPaginated
│   ├── pipes/                             ← Custom validation pipes
│   ├── middleware/                        ← Request ID, CORS
│   ├── validators/                        ← ⭐ Custom class-validator decorators
│   └── utils/                             ← Pure helpers
│
├── infrastructure/
│   ├── database/                          ← Prisma client + service
│   ├── redis/                             ← Cache service
│   ├── storage/                           ← S3/MinIO/RustFS adapter
│   ├── queue/                             ← BullMQ setup
│   └── http/                              ← Axios client, external API
│
├── config/
│   ├── env.validation.ts                  ← class-validator schema untuk env
│   ├── database.config.ts
│   └── app.config.ts
│
├── shared/
│   ├── constants/
│   ├── types/
│   └── enums/
│
├── app.module.ts
└── main.ts                                ← Global pipes, filters, interceptors

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

### Layer Responsibilities

| Layer             | Tanggung Jawab                                   | Boleh Akses                   |
| ----------------- | ------------------------------------------------ | ----------------------------- |
| `controller`      | Routing, parsing request, return response        | `service`                     |
| `service`         | Business logic, orchestration, transaction       | `repository`, other `service` |
| `repository`      | DB access via Prisma                             | Prisma client only            |
| `dto`             | Validasi input (class-validator), shape response | —                             |
| `common/`         | Cross-cutting concerns + base abstractions       | —                             |
| `infrastructure/` | Adapter ke external system                       | External libraries            |

### Rules

- ❌ Controller **tidak boleh** akses repository langsung
- ❌ Service **tidak boleh** import controller
- ❌ Entity **tidak boleh** ke-expose langsung di response (pakai DTO)
- ❌ **Jangan pakai Zod di BE** — gunakan class-validator agar konsisten dengan ekosistem NestJS (decorator, Swagger, transformer)
- ✅ Setiap module self-contained, ekspor lewat `<feature>.module.ts`
- ✅ Shared logic antar module → angkat ke `common/`

---

## DRY Patterns (BE) — Wajib Diterapkan

### 1. Base Entity — JANGAN copy-paste `id`, `createdAt`, `updatedAt`

```tsx
// common/entities/base.entity.ts
export abstract class BaseEntity {
  @ApiProperty() id: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
```

Setiap entity extends ini, tidak menulis ulang field standard.

### 2. Base Query DTO — semua endpoint list pakai pola yang sama

```tsx
// common/dto/base-query.dto.ts
export class BaseQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';
}
```

Feature DTO tinggal extend:

```tsx
export class QueryUserDto extends BaseQueryDto {
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}
```

### 3. Mapped Types — JANGAN tulis ulang DTO untuk update

```tsx
// ❌ JANGAN
export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  // ... duplikasi semua field dari Create
}

// ✅ PAKAI
export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

Tools tersedia: `PartialType`, `PickType`, `OmitType`, `IntersectionType`.

### 4. Pagination Response DTO — bentuk seragam di semua endpoint

```tsx
// common/dto/paginated.dto.ts
export class PaginatedDto<T> {
  @ApiProperty({ isArray: true }) data: T[];
  @ApiProperty() meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### 5. Generic Base Service — CRUD repetitif diangkat ke base class

```tsx
// common/services/base-crud.service.ts
export abstract class BaseCrudService<T, CreateDto, UpdateDto, QueryDto extends BaseQueryDto> {
  constructor(protected readonly repository: BaseRepository<T>) {}

  findAll(query: QueryDto) {
    /* ... */
  }
  findOne(id: string) {
    /* ... */
  }
  create(dto: CreateDto) {
    /* ... */
  }
  update(id: string, dto: UpdateDto) {
    /* ... */
  }
  remove(id: string) {
    /* ... */
  }
}
```

Feature service tinggal override yang perlu custom logic.

### 6. Response Transform Interceptor — bentuk response konsisten global

```tsx
// common/interceptors/response.interceptor.ts
// { success: true, data: ..., meta?: ... } — set once, apply globally di main.ts
app.useGlobalInterceptors(new ResponseInterceptor());
```

### 7. Global Validation Pipe — set sekali, berlaku di semua DTO

```tsx
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

### 8. Custom Validator — validasi domain spesifik jangan ditulis manual berulang

```tsx
// common/validators/is-unique.validator.ts
@ValidatorConstraint({ async: true })
export class IsUniqueConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) { /* check DB */ }
}

export function IsUnique(options: { table: string; column: string }) {
  return (object: object, propertyName: string) => {
    registerDecorator({ /* ... */ });
  };
}

// Pakainya:
@IsUnique({ table: 'user', column: 'email' })
email: string;
```

### 9. Composable Decorators — gabungan decorator yang sering dipakai

```tsx
// common/decorators/api-paginated.decorator.ts
export const ApiPaginatedResponse = <T extends Type<unknown>>(model: T) =>
  applyDecorators(ApiExtraModels(PaginatedDto, model), ApiOkResponse({/* schema gabungan */}));
```

### 10. Module Forwarding — Prisma/Redis/Storage module global, jangan import berulang

```tsx
@Global()
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
```

---

## DRY Checklist (BE)

Sebelum commit, tanya:

- [ ] Apakah ada DTO yang menulis ulang field dari DTO lain? → pakai `PartialType` / `PickType`
- [ ] Apakah ada entity yang menulis ulang `id`, `createdAt`, `updatedAt`? → extend `BaseEntity`
- [ ] Apakah ada service yang punya CRUD identik? → extend `BaseCrudService`
- [ ] Apakah ada validasi yang muncul di > 2 DTO? → buat custom validator decorator
- [ ] Apakah ada query pagination yang ditulis manual? → pakai `BaseQueryDto`
- [ ] Apakah ada response shape yang tidak seragam? → pastikan `ResponseInterceptor` global
- [ ] Apakah Prisma/Redis/Storage di-inject manual per module? → jadikan `@Global()`

---

##

# Project Structure Guide (Nuxt Edition)

> Panduan struktur folder + tech stack untuk new project. Berlaku sebagai konvensi tim.
> **Prinsip utama: DRY (Don't Repeat Yourself).** Setiap pola yang muncul ≥ 2 kali → angkat jadi abstraksi.

> **Scope perubahan:** FE pindah dari Next.js (React) ke **Nuxt 4 (Vue 3)**. BE tetap **NestJS** (terpisah, dipanggil via HTTP). Nitro (`server/`) opsional sebagai BFF/proxy, bukan pengganti BE utama.

---

## Tech Stack Overview

### Backend (tetap NestJS)

| Kategori         | Pilihan                                     | Catatan                                                   |
| ---------------- | ------------------------------------------- | --------------------------------------------------------- |
| Runtime          | **Bun** / Node.js LTS                       | Bun untuk greenfield, Node untuk legacy                   |
| Framework        | **NestJS**                                  | Modular, DI, decorator-based                              |
| ORM              | **Prisma**                                  | Type-safe, auto-migration                                 |
| Database (SQL)   | **PostgreSQL**                              | Default untuk transactional                               |
| Database (NoSQL) | **MongoDB** (Mongoose)                      | Hanya jika benar-benar butuh document-store               |
| Cache / Queue    | **Redis** + BullMQ                          | Cache, rate-limit, background jobs                        |
| Object Storage   | **MinIO** / **RustFS** / S3                 | File upload, asset storage                                |
| Auth             | **OAuth2 Client Credentials** + JWT         | Service-to-service & user auth                            |
| **Validation**   | **class-validator** + **class-transformer** | **Standar NestJS. Jangan pakai Zod di BE.**               |
| Mapped Types     | **@nestjs/mapped-types**                    | `PartialType`, `PickType`, `OmitType`, `IntersectionType` |
| Logging          | **Pino** (`nestjs-pino`)                    | Structured JSON logs                                      |
| API Docs         | **Swagger** (`@nestjs/swagger`)             | Auto-generated dari decorator                             |
| Testing          | **Jest** + Supertest                        | Unit + e2e                                                |

### Frontend (Nuxt)

| Kategori       | Pilihan                                                                       | Catatan                                                       |
| -------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Framework      | **Nuxt 4** (Vue 3)                                                            | File-based routing, Nitro, auto-import, SSR/SSG               |
| Language       | **TypeScript**                                                                | Strict mode                                                   |
| Styling        | **Tailwind CSS v4**                                                           | `@nuxtjs/tailwindcss` (atau setup native Vite plugin)         |
| UI Primitives  | **shadcn-vue** (Reka UI)                                                      | Via `shadcn-nuxt` module, copy-paste & fully ownable          |
| Forms          | **VeeValidate** + **Zod**                                                     | `@vee-validate/zod`. Zod **hanya** untuk FE schema            |
| Data Fetching  | **TanStack Query** (`@tanstack/vue-query`) + `useFetch`/`useAsyncData`        | Lihat catatan di bawah                                        |
| Tables         | **TanStack Table** (`@tanstack/vue-table`)                                    | Headless                                                      |
| State (client) | **Pinia** (`@pinia/nuxt`)                                                     | Pengganti Zustand — idiomatik Vue/Nuxt                        |
| HTTP Client    | **ofetch** (`$fetch` bawaan Nuxt)                                             | Pilih satu, konsisten. Axios hanya kalau perlu fitur spesifik |
| Icons          | **lucide-vue-next**                                                           | Konsisten dengan shadcn-vue                                   |
| Date           | **date-fns** / **Day.js**                                                     | Hindari moment.js                                             |
| Notifications  | **vue-sonner**                                                                | Toast modern                                                  |
| Testing        | **Vitest** + **@nuxt/test-utils** + **@testing-library/vue** + **Playwright** | Unit + integration + e2e                                      |

> **`useFetch`/`useAsyncData` vs `vue-query`:** Pakai `useAsyncData`/`useFetch` untuk **initial server-rendered data** (SSR-friendly, auto dedupe, payload transfer). Pakai `vue-query` untuk **client-side cache kompleks** (invalidation, optimistic update, infinite scroll, mutation). Jangan double-fetch — tentukan satu sumber kebenaran per data.

> **UI Primitives — shadcn-vue (default) vs Nuxt UI (pengecualian):** Default tim adalah **shadcn-vue** karena mayoritas app Nuxt kita adalah produk public-facing / AI (JDIH, portal, landing) yang butuh kontrol desain & brand penuh, custom typography (mis. DM Sans + Lora) gampang, dan mental model-nya konsisten dengan ekosistem shadcn/TanStack yang sudah dipakai. Admin CRUD internal (SIMPEG, e-Office, dst.) tetap di **Laravel + Filament**, jadi kebutuhan "dashboard batteries-included" sudah tercukupi di luar Nuxt.
>
> **Flip ke Nuxt UI v4** hanya kalau membangun _dashboard internal di Nuxt_ (bukan Filament) dengan target ship hitungan hari — komponen bawaannya (dashboard kit, command palette, `<UTable>` di atas TanStack Table, form) memangkas banyak boilerplate, dan sekarang full free (tier free + Pro sudah disatukan). Keduanya berdiri di atas Tailwind v4 + Reka UI, jadi pengetahuan dasar transferable. **Jangan campur dua design system dalam satu project** — pilih satu per project dan konsisten.
>
> Tanya saya sebelum implementasi

### DevOps & Tooling

| Kategori           | Pilihan                                                           |
| ------------------ | ----------------------------------------------------------------- |
| Container          | **Docker** + **Docker Compose**                                   |
| Deploy             | **Dokploy** (self-hosted) / Vercel                                |
| Reverse Proxy      | **Traefik** / Nginx                                               |
| CDN / WAF          | **Cloudflare**                                                    |
| Monitoring         | **Zabbix** (infra) + **Sentry** (app)                             |
| CI/CD              | **GitHub Actions**                                                |
| Linter / Formatter | **ESLint** (`@nuxt/eslint`) + **Prettier** + **Biome** (opsional) |
| Git Hooks          | **Husky** + **lint-staged**                                       |
| Commits            | **Conventional Commits** + **Commitlint**                         |
| App Ports          | Configurable via .env                                             |

---

## Backend (BE) Structure — NestJS

```
src/
├── modules/
│   └── <feature>/
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── <feature>.repository.ts
│       ├── <feature>.module.ts
│       ├── dto/
│       │   ├── create-<feature>.dto.ts
│       │   ├── update-<feature>.dto.ts    ← extends PartialType(CreateDto)
│       │   └── query-<feature>.dto.ts     ← extends BaseQueryDto
│       ├── entities/
│       │   └── <feature>.entity.ts        ← extends BaseEntity
│       └── tests/
│
├── common/
│   ├── dto/                               ← ⭐ Shared DTOs (BaseQueryDto, PaginationDto)
│   ├── entities/                          ← ⭐ BaseEntity (id, timestamps)
│   ├── repositories/                      ← ⭐ BaseRepository<T>
│   ├── services/                          ← ⭐ BaseCrudService<T>
│   ├── filters/                           ← Exception filters
│   ├── guards/                            ← Auth, roles, permissions
│   ├── interceptors/                      ← ResponseTransform, Logging, Cache
│   ├── decorators/                        ← @CurrentUser, @Roles, @ApiPaginated
│   ├── pipes/                             ← Custom validation pipes
│   ├── middleware/                        ← Request ID, CORS
│   ├── validators/                        ← ⭐ Custom class-validator decorators
│   └── utils/                             ← Pure helpers
│
├── infrastructure/
│   ├── database/                          ← Prisma client + service
│   ├── redis/                             ← Cache service
│   ├── storage/                           ← S3/MinIO/RustFS adapter
│   ├── queue/                             ← BullMQ setup
│   └── http/                              ← Axios client, external API
│
├── config/
│   ├── env.validation.ts                  ← class-validator schema untuk env
│   ├── database.config.ts
│   └── app.config.ts
│
├── shared/
│   ├── constants/
│   ├── types/
│   └── enums/
│
├── app.module.ts
└── main.ts                                ← Global pipes, filters, interceptors

prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

### Layer Responsibilities

| Layer             | Tanggung Jawab                                   | Boleh Akses                   |
| ----------------- | ------------------------------------------------ | ----------------------------- |
| `controller`      | Routing, parsing request, return response        | `service`                     |
| `service`         | Business logic, orchestration, transaction       | `repository`, other `service` |
| `repository`      | DB access via Prisma                             | Prisma client only            |
| `dto`             | Validasi input (class-validator), shape response | —                             |
| `common/`         | Cross-cutting concerns + base abstractions       | —                             |
| `infrastructure/` | Adapter ke external system                       | External libraries            |

### Rules

- ❌ Controller **tidak boleh** akses repository langsung
- ❌ Service **tidak boleh** import controller
- ❌ Entity **tidak boleh** ke-expose langsung di response (pakai DTO)
- ❌ **Jangan pakai Zod di BE** — gunakan class-validator (decorator, Swagger, transformer konsisten)
- ✅ Setiap module self-contained, ekspor lewat `<feature>.module.ts`
- ✅ Shared logic antar module → angkat ke `common/`

### DRY Patterns (BE) — Wajib Diterapkan

Tetap sama seperti standar NestJS: `BaseEntity`, `BaseQueryDto`, **Mapped Types** (`PartialType`/`PickType`/`OmitType`), `PaginatedDto<T>`, `BaseCrudService`, `ResponseInterceptor` global, `ValidationPipe` global, custom validator (`IsUnique`), composable decorators (`ApiPaginatedResponse`), dan module `@Global()` untuk Prisma/Redis/Storage.

> Detail implementasi tidak berubah dari guide aslinya — yang berubah hanya FE. Lihat lampiran BE jika perlu kode lengkap.

---

## Frontend (FE) Structure — Nuxt 4

```
app/                                ← srcDir Nuxt 4 (alias ~ → app/)
├── assets/
│   └── css/
│       └── main.css                ← Tailwind entry
│
├── components/                     ← auto-import (global, shared)
│   ├── ui/                         ← Atoms (shadcn-vue / Reka UI) — componentDir shadcn-nuxt
│   ├── common/                     ← Molecules: reusable lintas fitur
│   │   ├── fields/                 ← TextField, SelectField, DatePicker
│   │   ├── display/
│   │   └── layout/
│   ├── blocks/                     ← Organisms: standalone UI kompleks
│   │   ├── data-table/
│   │   ├── error-state/
│   │   ├── confirm-dialog/
│   │   └── empty-state/
│   └── shell/                      ← AppShell, Sidebar, Navbar
│
├── composables/                    ← global composables (auto-import) — pengganti `hooks/`
├── features/                       ← ⚠️ auto-import DIMATIKAN, import eksplisit via index.ts
│   └── <feature>/
│       ├── components/             ← komponen domain-specific
│       ├── composables/            ← (dulu: hooks/)
│       ├── api/                    ← fetcher per feature
│       ├── schemas/                ← Zod schemas
│       ├── types.ts
│       └── index.ts                ← public API (barrel)
│
├── layouts/                        ← default.vue, auth.vue, dashboard.vue
├── middleware/                     ← route middleware (auth.ts, dst.)
├── pages/                          ← file-based routing (pengganti app router)
│   ├── index.vue
│   ├── (auth)/                     ← route group via folder
│   └── <feature>/
│       ├── index.vue
│       └── [id].vue
│
├── plugins/                        ← vue-query, api-client, sonner, dll.
├── stores/                         ← Pinia stores (auto-import via @pinia/nuxt)
├── lib/                            ← ⚠️ TIDAK auto-import (import eksplisit, sengaja)
│   ├── api-client.ts
│   ├── auth.ts
│   ├── utils.ts                    ← `cn()` dll. (dibutuhkan shadcn-vue)
│   └── constants.ts
├── utils/                          ← auto-import: pure helper murni
├── types/
├── app.vue
├── error.vue                       ← global error page (pengganti error boundary)
└── app.config.ts

server/                             ← Nitro (opsional: BFF/proxy ke NestJS)
│   ├── api/
│   └── utils/
shared/                             ← tipe/util yang dipakai app & server
public/
nuxt.config.ts
```

### Perbedaan Kunci vs Next.js (baca dulu)

| Next.js                    | Nuxt                                                    | Catatan migrasi                                        |
| -------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `app/` route segments      | `pages/`                                                | File-based routing, bukan folder-as-route + `page.tsx` |
| `layout.tsx` per segment   | `layouts/` + `definePageMeta({ layout })`               | Layout dipilih per page                                |
| `loading.tsx`              | `<Suspense>` / `useAsyncData` `pending`                 | Tidak ada file konvensi `loading`                      |
| `middleware.ts` (edge)     | `middleware/` (route middleware) + `server/middleware/` | Pisahkan client-route vs server                        |
| React hooks (`hooks/`)     | composables (`composables/`)                            | Prefix `use`, auto-import                              |
| Zustand (`stores/`)        | Pinia (`stores/`)                                       | `defineStore`                                          |
| Explicit import everywhere | **Auto-import**                                         | Sumber utama divergensi — lihat bagian di bawah        |
| `RSC`/server components    | SSR + `<ClientOnly>` / `.client.vue`                    | Tidak ada RSC; pakai island/SSR                        |

### Layer Responsibilities

| Layer                 | Boleh Berisi                 | Boleh Akses                                                              |
| --------------------- | ---------------------------- | ------------------------------------------------------------------------ |
| `components/ui/`      | Base primitives only         | — (third-party)                                                          |
| `components/common/`  | Reusable molecules           | `ui/`, `lib/`, `composables/`, `utils/`                                  |
| `components/blocks/`  | Complex standalone organisms | `common/`, `ui/`, `lib/`, `composables/`, `utils/`                       |
| `components/shell/`   | App layout chrome            | `common/`, `blocks/`, `ui/`                                              |
| `features/<x>/`       | Domain-specific              | `common/`, `blocks/`, `ui/`, `lib/`, `composables/`, `utils/`, `stores/` |
| `pages/` + `layouts/` | Routing & page composition   | Semua                                                                    |
| `server/`             | Nitro endpoint/BFF           | `shared/`, `server/utils/` — **bukan** `app/`                            |

### Rules

- ❌ `components/ui/` jangan dimodifikasi manual — anggap third-party (kecuali via shadcn-vue CLI)
- ❌ `components/common/` **zero business logic** — kalau ada, salah tempat
- ❌ `features/<a>/` **tidak boleh** import dari `features/<b>/`
- ❌ `blocks/` tidak boleh import dari `features/`
- ❌ `app/` (client) **tidak boleh** import dari `server/`, dan sebaliknya — share lewat `shared/`
- ✅ Kalau 2 feature butuh share → angkat ke `components/common/` atau `composables/`
- ✅ Setiap feature ekspor public API via `index.ts`

---

## ⚠️ Auto-import Strategy (Nuxt-specific — WAJIB baca)

Beda paling besar dari Next.js: Nuxt **auto-import** `components/`, `composables/`, `utils/`, dan `stores/`. Ini bagus untuk layer shared, tapi **merusak boundary `features/`** kalau dibiarkan (feature A bisa diam-diam pakai komponen feature B tanpa import yang kelihatan). Aturan tim:

1. **Auto-import ON** untuk shared layer: `components/{ui,common,blocks,shell}`, `composables/`, `utils/`, `stores/`. Ini memang dipakai di mana-mana.
2. **Auto-import OFF** untuk `features/`. Wajib import eksplisit dari barrel `features/<x>/index.ts`. Ini yang menegakkan dependency rule + bikin pelanggaran kelihatan di code review.
3. `lib/` **tidak** auto-import (biar `api-client`, `auth` selalu di-import eksplisit).

```tsx
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', 'shadcn-nuxt', '@nuxtjs/tailwindcss', '@nuxt/eslint'],

  shadcn: { prefix: '', componentDir: './app/components/ui' },

  components: [
    // pathPrefix:false → <Button/> bukan <UiButton/>
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components/common', pathPrefix: false },
    { path: '~/components/blocks', pathPrefix: false },
    { path: '~/components/shell', pathPrefix: false },
    // features/ TIDAK didaftarkan → tidak auto-import (sengaja)
  ],

  imports: {
    dirs: ['composables', 'utils', 'stores'],
    // 'features' sengaja TIDAK dimasukkan
  },
});
```

> Konsekuensi: `<DataTable :columns :data />` bisa dipakai tanpa import (auto), tapi `import { UserTable } from '~/features/user-management'` harus eksplisit. Inilah yang menjaga arsitektur tetap rapi.

> **Alternatif advanced:** kalau feature makin gede & mau isolasi total, jadikan tiap feature **Nuxt Layer** (`layers/<feature>`). Layer punya `components/`, `composables/`, `pages/` sendiri dan di-`extends` dari root. Overkill untuk app kecil — pertimbangkan kalau sudah > 8–10 feature besar.

---

## DRY Patterns (FE) — Wajib Diterapkan

### 1. Generic DataTable

Jangan bikin table per feature. Pakai 1 `<DataTable />` headless (`@tanstack/vue-table`) yang terima `columns` config + `data`. Letakkan di `components/blocks/data-table/`.

```
<!-- pakai di feature -->
<DataTable :columns="userColumns" :data="data" :is-loading="pending" />
```

### 2. Field Components

`<TextField />`, `<SelectField />`, `<DatePicker />` di `components/common/fields/` — bundling label + input + error message. Integrasi via **VeeValidate** (`useField`) bukan react-hook-form. Form di feature tinggal pakai.

```
<!-- common/fields/TextField.vue -->
<script setup lang="ts">
const props = defineProps<{ name: string; label?: string }>()
const { value, errorMessage } = useField<string>(() => props.name)
</script>
```

### 3. Shared Zod Schemas

Schema primitif (`emailSchema`, `phoneSchema`, `paginationSchema`) di `lib/schemas/`. Feature schema compose dari ini. Zod **hanya** di FE (BE pakai class-validator). Dengan SSR, schema ini bisa jalan di server-render maupun client.

### 4. API Client Factory

1 instance di `lib/api-client.ts` berbasis **ofetch** (`$fetch.create`) dengan interceptor (`onRequest` inject token, `onResponseError` handle 401/refresh). Feature `api/` tinggal pakai instance ini, tidak setup ulang.

```tsx
// lib/api-client.ts
export const apiClient = $fetch.create({
  baseURL: useRuntimeConfig().public.apiBase,
  onRequest({ options }) {
    /* inject auth header */
  },
  onResponseError({ response }) {
    /* central error handling */
  },
});
```

### 5. Generic Query Composable

```tsx
// composables/usePaginatedQuery.ts — wrap @tanstack/vue-query untuk pola paginate seragam
export function usePaginatedQuery<T>(key: MaybeRefOrGetter<unknown[]>, fetcher, params) {
  return useQuery({ queryKey: /* ... */, queryFn: /* ... */ })
}
```

(Pengganti `hooks/use-paginated-query.ts`.)

### 6. Error/Empty/Loading State

1 set komponen `<ErrorState />`, `<EmptyState />`, `<LoadingState />` di `components/blocks/`. Dipakai konsisten di semua page. Untuk error fatal route → andalkan `app/error.vue`; untuk error lokal → `<NuxtErrorBoundary>`.

---

## Dependency Rule

```
     pages/ + layouts/
          ↓
       features/
          ↓
        blocks/
          ↓
        common/
          ↓
          ui/

composables/ · utils/ · lib/ · stores/ · types/   (shared, boleh diakses semua layer app)

shared/   ← satu-satunya jembatan antara app/ dan server/
```

> ⚠️ Jika butuh import melawan arah panah → **stop dan refactor**.
> ⚠️ `app/` ⇄ `server/` tidak boleh saling import langsung — lewat `shared/`.

---

## Naming Conventions

| Item                | Konvensi                                        | Contoh                                |
| ------------------- | ----------------------------------------------- | ------------------------------------- |
| File komponen       | `PascalCase.vue`                                | `UserCard.vue`                        |
| Komponen (template) | `PascalCase`                                    | `<UserCard />`                        |
| Composable          | `camelCase` prefix `use`, file `useUserData.ts` | `useUserData`                         |
| Util function       | `camelCase`                                     | `formatCurrency`                      |
| Constant            | `SCREAMING_SNAKE_CASE`                          | `MAX_FILE_SIZE`                       |
| Type/Interface      | `PascalCase`                                    | `UserProfile`                         |
| Folder feature      | `kebab-case`                                    | `user-management`                     |
| Page file           | `kebab-case.vue` → route                        | `pages/users/[id].vue` → `/users/:id` |
| Layout              | `kebab-case.vue`                                | `dashboard.vue`                       |
| Route middleware    | `kebab-case.ts`                                 | `auth.ts`                             |
| Pinia store         | fungsi `useXStore`, file `x.ts`                 | `useUserStore`                        |
| Nitro endpoint      | `kebab-case.<method>.ts`                        | `users.get.ts`, `[id].patch.ts`       |
| BE file (NestJS)    | `kebab-case.<type>.ts`                          | `user.service.ts`                     |
| API endpoint        | `kebab-case`, plural                            | `/api/users/:id`                      |

> **Catatan:** di Next.js file komponen pakai `kebab-case.tsx`. Di Vue/Nuxt konvensinya **`PascalCase.vue`** — lebih cocok dengan auto-import & resolusi nama komponen.

---

## Environment & Config

- FE: secrets server-only via `runtimeConfig`, yang public via `runtimeConfig.public` di `nuxt.config.ts` (jangan taruh secret di `public`).
- Jangan akses `import.meta.env` / `process.env` langsung di komponen — selalu via `useRuntimeConfig()`.
- BE (NestJS): validasi env saat startup dengan **class-validator** — bukan Zod. Akses via config service, bukan `process.env` langsung di luar `config/`.
- Gunakan **`.env`** untuk secrets, **`.env.example`** untuk template.
- Pisah config per environment: `development`, `staging`, `production`.

---

## Git Workflow

- **Branch:** `main` (prod) ← `develop` (staging) ← `feature/*`, `fix/*`, `chore/*`
- **Commit:** Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`)
- **PR:** Wajib review minimal 1 reviewer, CI hijau, squash/rebase (no merge commit)

---

## DRY Checklist (FE)

Sebelum commit, tanya:

- [ ] Ada `<table>` custom per feature? → pakai `<DataTable />` generic
- [ ] Ada `<input>` + label + error ditulis manual berulang? → pakai `common/fields/`
- [ ] Ada validasi muncul di > 2 form? → angkat ke `lib/schemas/`
- [ ] Ada `$fetch`/axios di-setup ulang per feature? → pakai `apiClient` dari `lib/`
- [ ] Ada pola `useQuery` paginate yang sama? → pakai `usePaginatedQuery`
- [ ] State empty/error/loading di-render beda-beda? → pakai komponen `blocks/` yang sama
- [ ] `features/<a>` import dari `features/<b>`? → angkat ke `common/` atau `composables/`
- [ ] Komponen feature ke-auto-import diam-diam? → pastikan `features/` tidak terdaftar di `components`/`imports`

---

## Prinsip DRY — Rule of Three

1. **Pertama kali** ditulis: biarkan inline
2. **Kedua kali** ditulis: tandai, mulai pikirkan abstraksi
3. **Ketiga kali** ditulis: **wajib** angkat jadi shared (base class, util, composable, atau komponen)

> Tapi jangan over-abstract terlalu dini. Premature abstraction sama buruknya dengan duplikasi.
