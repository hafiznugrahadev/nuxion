import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { defineRelations } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Relations for the relational query API (`db.query`). They only drive nested
 * reads — foreign keys come from `references()` in schema.ts. The users ↔ roles
 * many-to-many is expressed through the `user_roles` junction (its two `one`
 * relations carry the from/to keys; direct M2M shortcuts need them otherwise).
 */
export const relations = defineRelations(schema, (r) => ({
  users: {
    userRoles: r.many.userRoles(),
    refreshTokens: r.many.refreshTokens(),
    passwordResetTokens: r.many.passwordResetTokens(),
    notifications: r.many.notifications(),
    passkeys: r.many.passkeys(),
  },
  roles: {
    userRoles: r.many.userRoles(),
  },
  userRoles: {
    user: r.one.users({ from: r.userRoles.userId, to: r.users.id }),
    role: r.one.roles({ from: r.userRoles.roleId, to: r.roles.id }),
  },
  refreshTokens: {
    user: r.one.users({ from: r.refreshTokens.userId, to: r.users.id }),
  },
  passwordResetTokens: {
    user: r.one.users({ from: r.passwordResetTokens.userId, to: r.users.id }),
  },
  notifications: {
    user: r.one.users({ from: r.notifications.userId, to: r.users.id }),
  },
  passkeys: {
    user: r.one.users({ from: r.passkeys.userId, to: r.users.id }),
  },
  settings: {},
}));

/** The database type injected everywhere via `@InjectDrizzle()`. */
export type Database = NodePgDatabase<typeof relations>;

/** A transaction handle from `db.transaction()` — same query-builder API. */
export type TxLike = Parameters<Parameters<Database['transaction']>[0]>[0];

/** The database or an open transaction — shared helpers accept either. */
export type Executor = Database | TxLike;
