import { NotFoundException } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { roles, userRoles } from './schema';
import type { Executor } from './relations';

/**
 * Shared user↔role join helpers. The M2M lives in `user_roles`; these keep the
 * two-step load (rows, then roles for those rows) identical across modules
 * instead of each service hand-writing the join.
 */

/** Role-name rows for one user. */
export function roleNamesFor(db: Executor, userId: string): Promise<{ name: string }[]> {
  return db
    .select({ name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
}

/** userId → role-name rows for a batch of users (single follow-up query). */
export async function roleNamesByUser(
  db: Executor,
  userIds: string[],
): Promise<Map<string, { name: string }[]>> {
  const map = new Map<string, { name: string }[]>();
  if (userIds.length === 0) return map;

  const links = await db
    .select({ userId: userRoles.userId, name: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(inArray(userRoles.userId, userIds));

  for (const link of links) {
    const list = map.get(link.userId) ?? [];
    list.push({ name: link.name });
    map.set(link.userId, list);
  }
  return map;
}

/**
 * Replace a user's roles with the given role names (delete + insert). Runs on
 * the provided executor so callers can wrap it in a transaction. Unknown role
 * names throw 404 — mirrors the old `connect` failing on a missing record.
 */
export async function syncUserRoles(
  db: Executor,
  userId: string,
  roleNames: string[],
): Promise<void> {
  await db.delete(userRoles).where(eq(userRoles.userId, userId));
  if (roleNames.length === 0) return;

  const rows = await db.select({ id: roles.id }).from(roles).where(inArray(roles.name, roleNames));
  if (rows.length !== new Set(roleNames).size) {
    // Mirrors the old Prisma `connect` failure on a missing record (P2025 → 404).
    throw new NotFoundException('Record not found');
  }
  await db.insert(userRoles).values(rows.map((r) => ({ userId, roleId: r.id })));
}
