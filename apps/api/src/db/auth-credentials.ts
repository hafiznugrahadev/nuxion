import { and, eq } from 'drizzle-orm';
import type { Executor } from './relations';
import { authAccounts, authSessions } from './auth-schema';

export async function writeCredential(db: Executor, userId: string, password: string) {
  await db
    .insert(authAccounts)
    .values({ userId, accountId: userId, providerId: 'credential', password })
    .onConflictDoUpdate({
      target: [authAccounts.providerId, authAccounts.accountId],
      set: { password, updatedAt: new Date() },
    });
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

export async function readCredential(db: Executor, userId: string) {
  const [account] = await db
    .select({ password: authAccounts.password })
    .from(authAccounts)
    .where(and(eq(authAccounts.userId, userId), eq(authAccounts.providerId, 'credential')))
    .limit(1);
  return account?.password ?? null;
}
