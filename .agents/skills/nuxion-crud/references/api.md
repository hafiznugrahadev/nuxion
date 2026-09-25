# API recipe — NestJS CRUD module

File-by-file recipe for a new feature module under `apps/api/src/modules/<feature>/`,
with excerpts from the canonical `users` module. Stack: NestJS 12 + Drizzle ORM
(PostgreSQL via `@nestjs/drizzle` + `drizzle-orm/node-postgres`) + class-validator

- Redis + pino; tests on vitest. Monorepo commands run with
  `bun run --filter @nuxion/api <script>`.

A new module needs exactly these files, in this order:

```
apps/api/src/db/schema.ts                        # 1. table + generate migration
apps/api/src/db/relations.ts                     #    (relations only if needed)
apps/api/src/modules/<feature>/
├── entities/<feature>.entity.ts                 # 2. response shape
├── dto/create-<feature>.dto.ts                  # 3a. create input
├── dto/update-<feature>.dto.ts                  # 3b. update input
├── dto/query-<feature>.dto.ts                   # 3c. list query + sortBy whitelist
├── <feature>.repository.ts                      # 4. the only Drizzle layer
├── <feature>.service.ts                         # 5. business logic
├── <feature>.controller.ts                      # 6. routes + roles
├── <feature>.module.ts                          # 7. wiring
└── tests/<feature>.service.spec.ts              # 8. unit spec
apps/api/src/app.module.ts                       # 9. register
apps/api/test/<feature>.e2e-spec.ts              # 10. e2e (optional per route)
```

Everything global — response envelope, validation, pg error mapping, JWT +
roles guards, throttling, logging — is inherited automatically. Never re-create
it inside a feature.

## 1. Drizzle table + migration

Conventions from `src/db/schema.ts`:

```ts
export const products = pgTable(
  'products', // plural snake_case table name
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    // …scalar columns; uniqueIndex() on unique columns, nullable = no .notNull()
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('products_sku_key').on(t.sku)],
);
```

- UUID string ids via `.$defaultFn(() => randomUUID())` — `ParseUUIDPipe` on
  `:id` routes depends on it.
- Column names are explicit (`text('camelCase')`) — existing DB columns are
  quoted camelCase; keep names stable so `pg_dump` restores stay compatible.
- After editing: `bun run --filter @nuxion/api db:generate` (authors SQL under
  `apps/api/drizzle/` from the schema diff), then `db:migrate` (apply). Other
  scripts: `db:migrate` (CI/prod entrypoints use it), `db:studio`, `db:seed`.
- Drizzle has NO generated client and NO `include/omit` — reads select columns
  explicitly, relations are joins or follow-up queries (see `src/db/user-roles.ts`).

## 2. Entity — the response contract

`entities/<feature>.entity.ts` extends `BaseEntity` (id/createdAt/updatedAt +
Swagger docs). It declares exactly what the API returns — never bind a database
row type, never include secrets:

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
/** Columns the list can be sorted by (repository order-by keys). */
const SORTABLE_USER_FIELDS = ['name', 'email', 'createdAt'] as const;

export class QueryUserDto extends BaseQueryDto {
  /** Overridden from the base's free-form string so an unknown column (e.g.
   * `?sortBy=roles`, a relation) is a 400, not a database 500 from orderBy. */
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

## 4. Repository — the only Drizzle layer

A plain `@Injectable()` class injecting the database with `@InjectDrizzle()`
(the `DrizzleModule` in `app.module.ts` is global). No base class — write the
queries explicitly so pagination, search, and sorting stay readable per module:

```ts
@Injectable()
export class UsersRepository {
  constructor(
    @InjectDrizzle() private readonly db: Database, // type from @db/relations
  ) {}

  async paginate(
    query: BaseQueryDto,
    options: { roles?: string[] } = {},
  ): Promise<PaginatedResult<UserWithRoles>> {
    // 1. build conditions: ilike() per searchable column, or() them for ?search=
    // 2. sort: SORTABLE_COLUMNS[query.sortBy] + asc()/desc() — DTO whitelisted
    // 3. rows + count(*)::int in Promise.all, limit/offset from query
    // 4. attach relations via one follow-up query (roleNamesByUser)
  }

  createWithRoles(data: { email: string; name: string; password: string }, roleNames: string[]) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(users).values(data).returning(PUBLIC_COLUMNS);
      await syncUserRoles(tx, row.id, roleNames); // delete + insert on user_roles
      return row;
    });
  }
}
```

Rules:

- Define a `PUBLIC_COLUMNS` selection object (all columns minus secrets) and use
  it on every read — Drizzle has no `omit`, so the exclusion IS the select. The
  one method that may read a hash selects `{ id, password }` explicitly and
  lives here, never in a service.
- Undefined fields in `.set()` are ignored — partial updates come free.
- Relation writes (M2M) are explicit delete + insert on the join table, wrapped
  in `db.transaction` when they must be atomic with the row write.
- Count with `` sql<number>`count(*)::int` `` — pg's count returns bigint.

## 5. Service — business logic

A standalone `@Injectable()` class over its repository — no base class to fight;
each service owns its findAll/findOne/create/update/remove with explicit
`entityName`-powered 404s.

```ts
@Injectable()
export class UsersService {
  private readonly entityName = 'User';

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly redis: RedisService,
  ) {}

  async findAll(query: QueryUserDto): Promise<PaginatedResult<UserEntity>> {
    // optional Redis read-through cache — see "List caching" below
    const page = await this.usersRepository.paginate(query, { roles: query.roles });
    return { ...page, data: page.data.map((u) => this.toEntity(u)) };
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
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
- Drizzle ignores `undefined` fields in `.set()`, so "only the provided fields
  are written" comes free.

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

The database is injected with `@InjectDrizzle()` (`DrizzleModule` is global);
`RedisModule`, `StorageModule`, … are `@Global()` — feature modules never import
them. Path aliases `@common/* @config/* @db/* @infrastructure/* @modules/* @shared/*`
are preconfigured.

## Seeding

`src/db/seed.ts` (run via `db:seed`) must be idempotent: reference rows via
insert + `onConflictDoNothing` + re-read (or `onConflictDoUpdate`), demo rows via
one bulk insert with `onConflictDoNothing`. Demo data should make pagination and
date-sort visible (the users seed spreads 100 rows over ~4 months, one ADMIN per
9 users). If another process writes the table outside the API, bump the
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

| Concern                                            | Where                                             |
| -------------------------------------------------- | ------------------------------------------------- |
| `{ success, data, meta? }` envelope                | `common/interceptors/response.interceptor.ts`     |
| Error shape + pg 23505→409, 23503→400              | `common/filters/all-exceptions.filter.ts`         |
| Validation (whitelist, forbid unknown, transform)  | `main.ts` global `ValidationPipe`                 |
| JWT auth + role checks                             | global `APP_GUARD`s in `modules/auth`             |
| `IsUnique` async validator                         | `common/validators/is-unique.validator.ts`        |
| Pagination meta (`total, page, limit, totalPages`) | `common/interfaces/paginated-result.interface.ts` |
| Rate limiting / logging                            | global `ThrottlerGuard` / pino                    |
