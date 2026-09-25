import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { Database } from '@db/relations';
import { roles, userRoles, users } from '@db/schema';
import { roleNamesByUser, syncUserRoles } from '@db/user-roles';
import type { BaseQueryDto } from '@common/dto/base-query.dto';
import {
  buildPaginationMeta,
  type PaginatedResult,
} from '@common/interfaces/paginated-result.interface';
import { UserEntity } from './entities/user.entity';

/** A user row with its roles included and the secrets omitted. */
export type UserWithRoles = Omit<UserEntity, 'roles'> & { roles: { name: string }[] };

/**
 * Secrets never leave the repository (SPEC): every read selects PUBLIC_COLUMNS
 * explicitly — the Drizzle equivalent of the old `omit: { password, … }`.
 */
const PUBLIC_COLUMNS = {
  id: users.id,
  email: users.email,
  name: users.name,
  avatarUrl: users.avatarUrl,
  twoFactorEnabled: users.twoFactorEnabled,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
} as const;

/** Columns the user list can be sorted by (keys of the DTO whitelist). */
const SORTABLE_COLUMNS = {
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
} as const;

@Injectable()
export class UsersRepository {
  constructor(
    @InjectDrizzle()
    private readonly db: Database,
  ) {}

  /**
   * Paginated + searchable + sortable list. Role filtering uses an IN subquery
   * over the `user_roles` join; roles are attached with one follow-up query.
   */
  async paginate(
    query: BaseQueryDto,
    options: { roles?: string[] } = {},
  ): Promise<PaginatedResult<UserWithRoles>> {
    const conditions: SQL[] = [];
    if (query.search) {
      conditions.push(
        or(ilike(users.name, `%${query.search}%`), ilike(users.email, `%${query.search}%`))!,
      );
    }
    if (options.roles?.length) {
      conditions.push(
        inArray(
          users.id,
          this.db
            .select({ id: userRoles.userId })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(inArray(roles.name, options.roles)),
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const column =
      SORTABLE_COLUMNS[query.sortBy as keyof typeof SORTABLE_COLUMNS] ?? users.createdAt;
    const direction = query.order === 'asc' ? asc : desc;

    const [rows, [countRow]] = await Promise.all([
      this.db
        .select(PUBLIC_COLUMNS)
        .from(users)
        .where(where)
        .orderBy(direction(column))
        .limit(query.limit)
        .offset(query.skip),
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(users)
        .where(where),
    ]);

    const roleMap = await roleNamesByUser(
      this.db,
      rows.map((r) => r.id),
    );
    return {
      data: rows.map((row) => ({ ...row, roles: roleMap.get(row.id) ?? [] })),
      meta: buildPaginationMeta(countRow?.total ?? 0, query.page, query.limit),
    };
  }

  async findWithRoles(id: string): Promise<UserWithRoles | null> {
    const [row] = await this.db.select(PUBLIC_COLUMNS).from(users).where(eq(users.id, id)).limit(1);
    if (!row) return null;
    const roleMap = await roleNamesByUser(this.db, [row.id]);
    return { ...row, roles: roleMap.get(row.id) ?? [] };
  }

  /** The only path that reads the password hash — used to verify the current
   *  password before a self-service change. */
  async findWithPassword(id: string): Promise<{ id: string; password: string } | null> {
    const [row] = await this.db
      .select({ id: users.id, password: users.password })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return row ?? null;
  }

  async createWithRoles(
    data: { email: string; name: string; password: string },
    roleNames: string[],
  ): Promise<UserWithRoles> {
    const created = await this.db.transaction(async (tx) => {
      const [row] = await tx.insert(users).values(data).returning(PUBLIC_COLUMNS);
      await syncUserRoles(tx, row.id, roleNames);
      return row;
    });
    const roleMap = await roleNamesByUser(this.db, [created.id]);
    return { ...created, roles: roleMap.get(created.id) ?? [] };
  }

  async updateWithRoles(
    id: string,
    data: { name?: string; password?: string; avatarUrl?: string | null },
    roleNames?: string[],
  ): Promise<UserWithRoles> {
    const updated = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(users)
        .set(data) // undefined fields are ignored — partial updates come free
        .where(eq(users.id, id))
        .returning(PUBLIC_COLUMNS);
      if (!row) throw new NotFoundException('Record not found');
      if (roleNames) await syncUserRoles(tx, id, roleNames);
      return row;
    });
    const roleMap = await roleNamesByUser(this.db, [id]);
    return { ...updated, roles: roleMap.get(id) ?? [] };
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
