import { randomUUID } from 'node:crypto';
import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './schema';

export const authAccounts = pgTable(
  'auth_accounts',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('accountId').notNull(),
    providerId: text('providerId').notNull(),
    password: text('password'),
    accessToken: text('accessToken'),
    refreshToken: text('refreshToken'),
    idToken: text('idToken'),
    accessTokenExpiresAt: timestamp('accessTokenExpiresAt', { precision: 3 }),
    refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt', { precision: 3 }),
    scope: text('scope'),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('auth_accounts_provider_account_key').on(t.providerId, t.accountId),
    index('auth_accounts_userId_idx').on(t.userId),
  ],
);

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
    ipAddress: text('ipAddress'),
    userAgent: text('userAgent'),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('auth_sessions_token_key').on(t.token),
    index('auth_sessions_userId_idx').on(t.userId),
  ],
);

export const authVerifications = pgTable(
  'auth_verifications',
  {
    id: text('id').primaryKey().$defaultFn(randomUUID),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expiresAt', { precision: 3 }).notNull(),
    createdAt: timestamp('createdAt', { precision: 3 }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { precision: 3 }).notNull().defaultNow(),
  },
  (t) => [index('auth_verifications_identifier_idx').on(t.identifier)],
);
