import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { asc, eq, sql } from 'drizzle-orm';
import type { Database } from '@db/relations';
import { roles, userRoles } from '@db/schema';

/** A role row plus how many users hold it (computed, never stored). */
export type RoleWithCount = {
  id: string;
  name: string;
  createdAt: Date;
  userCount: number;
};

const COLUMNS = {
  id: roles.id,
  name: roles.name,
  createdAt: roles.createdAt,
  userCount: sql<number>`count(${userRoles.userId})::int`,
} as const;

@Injectable()
export class RolesRepository {
  constructor(
    @InjectDrizzle()
    private readonly db: Database,
  ) {}

  /**
   * The full catalog (no pagination — a role list is small by nature), seeded
   * roles first so SUPER_ADMIN/ADMIN/USER keep a stable, familiar order.
   */
  listWithCounts(): Promise<RoleWithCount[]> {
    return this.db
      .select(COLUMNS)
      .from(roles)
      .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
      .groupBy(roles.id)
      .orderBy(asc(roles.createdAt));
  }

  async findById(id: string): Promise<RoleWithCount | null> {
    const [row] = await this.db
      .select(COLUMNS)
      .from(roles)
      .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
      .groupBy(roles.id)
      .where(eq(roles.id, id));
    return row ?? null;
  }

  async findByName(name: string): Promise<{ id: string; name: string } | null> {
    const [row] = await this.db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.name, name));
    return row ?? null;
  }

  async create(data: { name: string }): Promise<{ id: string; name: string; createdAt: Date }> {
    const [row] = await this.db.insert(roles).values(data).returning({
      id: roles.id,
      name: roles.name,
      createdAt: roles.createdAt,
    });
    return row;
  }

  async rename(id: string, name: string): Promise<{ id: string; name: string; createdAt: Date }> {
    const [row] = await this.db
      .update(roles)
      .set({ name })
      .where(eq(roles.id, id))
      .returning({ id: roles.id, name: roles.name, createdAt: roles.createdAt });
    return row;
  }

  /**
   * Deleting a role cascades `user_roles` (FK onDelete) — holders simply lose
   * the role. Well-known roles are rejected by the service before this runs.
   */
  async delete(id: string): Promise<void> {
    await this.db.delete(roles).where(eq(roles.id, id));
  }
}
