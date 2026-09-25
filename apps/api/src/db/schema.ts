import { randomUUID } from 'node:crypto';
import { createId } from '@paralleldrive/cuid2';
import {
  bigint,
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * Drizzle schema for nuxion (PostgreSQL).
 *
 * Table and column names mirror the legacy Prisma database exactly (quoted
 * camelCase columns, snake_case tables) so `pg_dump` restores stay compatible.
 * The one deliberate change: the implicit Prisma M2M `_UserRoles(A, B)` join
 * table is now an explicit `user_roles(userId, roleId)` table.
 *
 * Defaults Prisma applied client-side are reproduced with Drizzle's
 * `$defaultFn`/`$onUpdate` — the database itself has no id defaults.
 */

export const users = pgTable(
  'users',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    email: text('email').notNull(),
    name: text('name').notNull(),
    password: text('password').notNull(),
    avatarUrl: text('avatarUrl'),
    // TOTP two-factor. The secret is AES-256-GCM encrypted at rest (two-factor.service.ts);
    // twoFactorEnabled only flips to true once activation is confirmed with a valid code.
    twoFactorEnabled: boolean('twoFactorEnabled').notNull().default(false),
    twoFactorSecret: text('twoFactorSecret'),
    recoveryCodes: text('recoveryCodes'), // JSON array of SHA-256 hashes; plaintext is shown once
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { precision: 3 })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex('users_email_key').on(t.email)],
);

export const roles = pgTable(
  'roles',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    name: text('name').notNull(), // e.g. ADMIN, USER — add rows without code changes
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('roles_name_key').on(t.name)],
);

/** Explicit join table for the User ↔ Role many-to-many (scalable RBAC). */
export const userRoles = pgTable(
  'user_roles',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('roleId')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index('user_roles_roleId_idx').on(t.roleId),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    familyId: text('familyId').notNull(), // tokens rotated from one login share a family (reuse detection)
    tokenHash: text('tokenHash').notNull(), // SHA-256 of the opaque token (raw value never stored)
    revokedAt: timestamp('revokedAt', { precision: 3 }), // set on rotation/logout; non-null means unusable
    expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_tokenHash_key').on(t.tokenHash),
    index('refresh_tokens_userId_idx').on(t.userId),
    index('refresh_tokens_familyId_idx').on(t.familyId),
  ],
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => randomUUID()),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('tokenHash').notNull(), // SHA-256 of the opaque token (raw value never stored)
    usedAt: timestamp('usedAt', { precision: 3 }), // set once consumed; non-null means spent
    expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('password_reset_tokens_tokenHash_key').on(t.tokenHash),
    index('password_reset_tokens_userId_idx').on(t.userId),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    type: text('type').notNull().default('info'), // info | success | warning | error
    readAt: timestamp('readAt', { precision: 3 }),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('notifications_userId_createdAt_idx').on(t.userId, t.createdAt)],
);

export const passkeys = pgTable(
  'passkeys',
  {
    id: text('id').primaryKey(), // base64url credential ID from the authenticator (app-supplied)
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    publicKey: text('publicKey').notNull(), // base64url COSE public key
    counter: bigint('counter', { mode: 'bigint' }).notNull().default(0n), // signature counter (clone detection)
    transports: text('transports').array().notNull().default([]), // internal | hybrid | nfc | smart-card | usb
    deviceType: text('deviceType'), // singleDevice | multiDevice
    backedUp: boolean('backedUp').notNull().default(false),
    name: text('name'), // user label, e.g. "MacBook Touch ID"
    lastUsedAt: timestamp('lastUsedAt', { precision: 3 }),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('passkeys_userId_idx').on(t.userId)],
);

/** App-wide settings grouped by key (e.g. 'branding'). The row's value shape is
 *  validated by the settings module's DTOs — new groups need no schema migration. */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
  updatedAt: timestamp('updatedAt', { precision: 3 })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type RoleRow = typeof roles.$inferSelect;
export type RefreshTokenRow = typeof refreshTokens.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
export type PasskeyRow = typeof passkeys.$inferSelect;
export type SettingRow = typeof settings.$inferSelect;
