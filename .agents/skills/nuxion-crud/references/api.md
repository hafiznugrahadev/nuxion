# API recipe — NestJS CRUD module

File-by-file recipe for a new feature module under `apps/api/src/modules/<feature>/`,
with excerpts from the canonical `users` module. Stack: NestJS 12 + Prisma 7
(PostgreSQL via `@prisma/adapter-pg`) + class-validator + Redis + pino; tests on
vitest. Monorepo commands run with `bun run --filter @nuxion/api <script>`.

A new module needs exactly these files, in this order:

```
apps/api/prisma/schema.prisma                    # 1. model + migrate
apps/api/src/modules/<feature>/
├── entities/<feature>.entity.ts                 # 2. response shape
├── dto/create-<feature>.dto.ts                  # 3a. create input
├── dto/update-<feature>.dto.ts                  # 3b. update input
├── dto/query-<feature>.dto.ts                   # 3c. list query + sortBy whitelist
├── <feature>.repository.ts                      # 4. the only Prisma layer
├── <feature>.service.ts                         # 5. business logic
├── <feature>.controller.ts                      # 6. routes + roles
├── <feature>.module.ts                          # 7. wiring
└── tests/<feature>.service.spec.ts              # 8. unit spec
apps/api/src/app.module.ts                       # 9. register
apps/api/test/<feature>.e2e-spec.ts              # 10. e2e (optional per route)
```

Everything global — response envelope, validation, Prisma error mapping, JWT +
roles guards, throttling, logging — is inherited automatically. Never re-create
it inside a feature.

## 1. Prisma model + migration

Conventions from `prisma/schema.prisma`:

```prisma
model Product {
  id        String   @id @default(uuid())
  // …scalar fields; @unique for unique columns, String? for nullable
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  roles     Role[]   @relation("ProductRoles")   // M2M relations get named relations
  @@map("products")                             // plural snake_case table name
}
```

- UUID string ids (never cuid/int) — `ParseUUIDPipe` on `:id` routes depends on it.
- After editing: `bun run --filter @nuxion/api prisma:migrate` (dev; creates the
  migration) — the client regenerates into `src/generated/prisma` automatically.
- Other scripts: `prisma:deploy` (CI/prod), `prisma:studio`, `db:seed`.

## 2. Entity — the response contract

`entities/<feature>.entity.ts` extends `BaseEntity` (id/createdAt/updatedAt +
Swagger docs). It declares exactly what the API returns — never bind a Prisma
model, never include secrets:

```ts
export class UserEntity extends BaseEntity {
  @ApiProperty() email!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) avatarUrl?: string | null;
  @ApiProperty({ type: [String], example: ['ADMIN', 'USER'] }) roles!: string[];
}
```

Relations are flattened here (`Role[]` rows → `string[]` names) in the service's
`toEntity` mapper — keep that mapping in the service, not the controller.

## 3. DTOs

**Create** — class-validator decorators only; unique columns get the async DB-backed
validator (`IsUniqueConstraint` is DI-registered, `useContainer` is already wired):

```ts
export class CreateUserDto {
  @ApiProperty({ example: 'jane@nuxion.test' })
  @IsEmail()
  @IsUnique({ model: 'user', column: 'email' })
  email!: string;

  @ApiProperty({ type: [String], example: ['USER'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles!: string[];
}
```

**Update** — all-optional subset. `PartialType(CreateUserDto)` is the default
(SPEC DRY #3); hand-write it when a field is deliberately different (users: email
is immutable, so `UpdateUserDto` omits it entirely instead of partial-ing it).

**Query** — extends `BaseQueryDto` (`page=1`, `limit=10 max 100`, `search`,
`order='desc'`, `sortBy='createdAt'`, derived `skip`). Two mandatory moves:

```ts
/** Columns the list can be sorted by (Prisma orderBy keys). */
const SORTABLE_USER_FIELDS = ['name', 'email', 'createdAt'] as const;

export class QueryUserDto extends BaseQueryDto {
  /** Overridden from the base's free-form string so an unknown column (e.g.
   * `?sortBy=roles`, a relation) is a 400, not a Prisma 500 from orderBy. */
  @ApiPropertyOptional({ enum: SORTABLE_USER_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SORTABLE_USER_FIELDS)
  override sortBy: (typeof SORTABLE_USER_FIELDS)[number] = 'createdAt';

  /** Repeatable query param: `?roles=ADMIN&roles=USER` — ANY semantics. */
  @ApiPropertyOptional({ enum: UserRole, isArray: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsEnum(UserRole, { each: true })
  roles?: UserRole[];
}
```

The global `ValidationPipe` runs `whitelist + forbidNonWhitelisted + transform`,
so unknown query/body fields are 400s — e2e-test that once per module.

## 4. Repository — the only Prisma layer

Extend `BaseRepository<Entity>`, provide the delegate + searchable fields, and add
relation-aware methods when needed. `paginate()` (inherited) turns `search` into
an insensitive-contains `OR` over `searchableFields`, applies
`orderBy: { [sortBy]: order }`, runs `findMany` + `count` in parallel, and
returns `PaginatedResult<T>` (`{ data, meta }`).

```ts
@Injectable()
export class UsersRepository extends BaseRepository<UserEntity> {
  protected readonly searchableFields = ['name', 'email']; // drives ?search=

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  protected get delegate(): PrismaDelegate {
    return this.prisma.user as unknown as PrismaDelegate;
  }

  // Relation-specific reads/writes, always omitting secrets:
  createWithRoles(
    data: { email: string; name: string; password: string },
    roleNames: string[],
  ): Promise<UserWithRoles> {
    return this.prisma.user.create({
      data: { ...data, roles: { connect: roleNames.map((name) => ({ name })) } },
      include: { roles: true },
      omit: { password: true },
    }) as unknown as Promise<UserWithRoles>;
  }
}
```

Rules: every read that could carry a secret sets `omit: { password: true }`;
writes to relations use `connect` (create) / `set` (update); the one method that
may read a hash uses `select: { id: true, password: true }` and lives here, never
in a service.

## 5. Service — business logic

Extend `BaseCrudService<Entity, CreateDto, UpdateDto, QueryDto>` and override only
what needs logic. The base already implements `findAll/findOne/create/update/
remove` with `entityName`-powered 404s.

```ts
@Injectable()
export class UsersService extends BaseCrudService<
  UserEntity,
  CreateUserDto,
  UpdateUserDto,
  QueryUserDto
> {
  protected readonly entityName = 'User';

  override async findAll(query: QueryUserDto): Promise<PaginatedResult<UserEntity>> {
    // optional Redis read-through cache — see "List caching" below
    const where: Record<string, unknown> = {};
    if (query.roles?.length) where.roles = { some: { name: { in: query.roles } } };
    const page = await this.usersRepository.paginate(query, {
      where,
      include: { roles: true },
      omit: { password: true },
    });
    return { ...page, data: page.data.map((u) => this.toEntity(u)) };
  }

  override async create(dto: CreateUserDto): Promise<UserEntity> {
    const { roles, password, ...rest } = dto;
    const created = await this.usersRepository.createWithRoles(
      { ...rest, password: await hashPassword(password) },
      roles,
    );
    await this.invalidateList();
    return this.toEntity(created);
  }
}
```

- Transform before persisting (hash passwords with `@common/utils/password`),
  map to the entity after.
- `update`/`remove` call `await this.findOne(id)` first — that's the 404 check.
- Prisma ignores `undefined`, so "only the provided fields are written" comes free.

**List caching (optional).** Reads go through a generation-counter cache
(`users:gen` INCR on every write, TTL 30 s). Cache ops are wrapped in `safe()` so
Redis being down never breaks the endpoint. Copy this only for hot lists; make
`invalidateList()` public when other modules write the same table (auth
registration bumps the users cache).

## 6. Controller — routes and roles

```ts
@ApiTags('users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Literal routes BEFORE :id so "me" is never captured as a UUID param.
  @Get('me')
  findMe(@CurrentUser('id') id: string) { return this.usersService.findOne(id); }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)          // reads: admin and up
  @ApiPaginatedResponse(UserEntity)                     // lifts meta into the envelope docs
  findAll(@Query() query: QueryUserDto) { return this.usersService.findAll(query); }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.usersService.findOne(id); }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)                          // writes: super admin only
  create(@Body() dto: CreateUserDto) { return this.usersService.create(dto); }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) { … }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)                              // DELETE returns 200 + the deleted row
  remove(@Param('id', ParseUUIDPipe) id: string) { … }
}
```

Notes: guards are global (`JwtAuthGuard` + `RolesGuard` as `APP_GUARD`s) — no
`@UseGuards` in feature code; `@Roles(...)` passes when the user holds ANY listed
role; `@Public()` on a route opts out entirely (rare — e.g. file viewing). The
global prefix makes the path `/api/users`.

## 7–9. Module wiring

`<feature>.module.ts` is minimal; register the module in `src/app.module.ts`:

```ts
@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService], // only the service crosses module borders
})
export class UsersModule {}
```

Infrastructure modules (`PrismaModule`, `RedisModule`, …) are `@Global()` —
feature modules never import them. Path aliases `@common/* @config/* @infrastructure/*
@modules/* @shared/* @generated/*` are preconfigured.

## Seeding

`prisma/seed.ts` (run via `db:seed`) must be idempotent: upsert reference rows,
wrap demo rows in try/catch on Prisma `P2002`. Demo data should make pagination
and date-sort visible (the users seed spreads 100 rows over ~4 months, one ADMIN
per 9 users). If another process writes the table outside the API, bump the
feature's `*:gen` Redis counter or stale list caches persist up to their TTL.

## Testing (vitest)

**Unit** — `modules/<feature>/tests/<feature>.service.spec.ts`, mock the
repository (and Redis when cached) with `vi.fn()`; assert the important contracts
(secrets omitted, cache invalidate called, entity mapping):

```ts
const repo = { paginate: vi.fn(), findWithRoles: vi.fn() };
const redis = { get: vi.fn(), set: vi.fn(), raw: { incr: vi.fn() } };
const service = new UsersService(repo as never, redis as never);
```

**E2E** — `test/<feature>.e2e-spec.ts` with the shared helper:

```ts
const app = await createTestApp(); // replicates the main.ts pipeline
const token = await login(request, SEED_USERS.superAdmin.email, SEED_USERS.superAdmin.password);
// create rows with `E2E_PREFIX`-tagged emails; clean up with deleteMany in afterAll
```

Cover: happy path per route, 400 (validation + unknown sortBy), 401 (no token),
403 (role too low — log in as `SEED_USERS.user`), 404 (unknown uuid), 409
(unique conflict). Run: `bun run --filter @nuxion/api test` / `test:e2e`.

## Free globals (do not reimplement)

| Concern                                              | Where                                             |
| ---------------------------------------------------- | ------------------------------------------------- |
| `{ success, data, meta? }` envelope                  | `common/interceptors/response.interceptor.ts`     |
| Error shape + Prisma P2002→409, P2025→404, P2003→400 | `common/filters/all-exceptions.filter.ts`         |
| Validation (whitelist, forbid unknown, transform)    | `main.ts` global `ValidationPipe`                 |
| JWT auth + role checks                               | global `APP_GUARD`s in `modules/auth`             |
| `IsUnique` async validator                           | `common/validators/is-unique.validator.ts`        |
| Pagination meta (`total, page, limit, totalPages`)   | `common/interfaces/paginated-result.interface.ts` |
| Rate limiting / logging                              | global `ThrottlerGuard` / pino                    |
