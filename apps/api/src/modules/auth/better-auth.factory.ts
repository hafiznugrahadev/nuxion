import { randomBytes, randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Database } from '@db/relations';
import { users, authAccounts, authSessions, authVerifications } from '@db/schema';
import type { MailService } from '@infrastructure/mail/mail.service';
import { hashPassword, verifyPassword } from '@common/utils/password';

export async function createBetterAuth(db: Database, config: ConfigService, mail: MailService) {
  const [
    { betterAuth },
    { drizzleAdapter },
    { createAuthEndpoint, APIError },
    { setSessionCookie },
    { z },
  ] = await Promise.all([
    import('better-auth'),
    import('@better-auth/drizzle-adapter'),
    import('better-auth/api'),
    import('better-auth/cookies'),
    import('zod'),
  ]);
  const logger = new Logger('BetterAuth');
  const secure = config.get<boolean>('app.cookie.secure') ?? false;
  const prefix = config.get<string>('app.apiPrefix') ?? 'api';
  return betterAuth({
    appName: 'Nuxion',
    secret: config.getOrThrow<string>('app.auth.secret'),
    baseURL: config.getOrThrow<string>('app.auth.url'),
    basePath: `/${prefix}/auth`,
    trustedOrigins: config.get<string[]>('app.csrf.trustedOrigins') ?? [],
    database: drizzleAdapter(db, {
      provider: 'pg',
      transaction: true,
      schema: {
        user: users,
        account: authAccounts,
        session: authSessions,
        verification: authVerifications,
      },
    }),
    user: { fields: { image: 'avatarUrl' } },
    verification: { storeIdentifier: 'hashed' },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      password: {
        hash: hashPassword,
        verify: ({ password, hash }) => verifyPassword(password, hash),
      },
      resetPasswordTokenExpiresIn: (config.get<number>('app.passwordReset.ttlMinutes') ?? 30) * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const resetUrl = new URL(config.getOrThrow<string>('app.passwordReset.url'));
        resetUrl.searchParams.set('token', token);
        try {
          await mail.send({
            to: user.email,
            subject: 'Reset your password',
            text: `Hi ${user.name},\n\nReset your password: ${resetUrl.toString()}\n\nIf you did not request this, ignore this email.`,
          });
        } catch (error) {
          if (!(error instanceof Error)) throw error;
          logger.error('Password reset email delivery failed');
        }
      },
    },
    session: {
      expiresIn: (config.get<number>('app.auth.sessionExpiresInDays') ?? 7) * 86400,
      updateAge: 86400,
      cookieCache: { enabled: false },
    },
    advanced: {
      database: { generateId: () => randomUUID() },
      useSecureCookies: secure,
      defaultCookieAttributes: {
        httpOnly: true,
        secure,
        sameSite: secure ? 'none' : 'lax',
        path: '/',
      },
    },
    plugins: [
      {
        id: 'nuxion-verified-session',
        endpoints: {
          requestLegacyPasswordReset: createAuthEndpoint.serverOnly(
            {
              method: 'POST',
              body: z.object({ userId: z.string() }),
            },
            async (ctx) => {
              const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
              const sendResetPassword = ctx.context.options.emailAndPassword?.sendResetPassword;
              if (!user || !sendResetPassword) throw new APIError('BAD_REQUEST');
              const token = randomBytes(32).toString('hex');
              await db.delete(authVerifications).where(eq(authVerifications.value, user.id));
              await ctx.context.internalAdapter.createVerificationValue({
                value: user.id,
                identifier: `reset-password:${token}`,
                expiresAt: new Date(
                  Date.now() + (config.get<number>('app.passwordReset.ttlMinutes') ?? 30) * 60000,
                ),
              });
              await sendResetPassword({
                user,
                token,
                url: config.getOrThrow<string>('app.passwordReset.url'),
              });
              return ctx.json({ success: true });
            },
          ),
          issueVerifiedSession: createAuthEndpoint.serverOnly(
            {
              method: 'POST',
              body: z.object({ userId: z.string() }),
            },
            async (ctx) => {
              const user = await ctx.context.internalAdapter.findUserById(ctx.body.userId);
              if (!user) throw new APIError('UNAUTHORIZED');
              const session = await ctx.context.internalAdapter.createSession(user.id);
              if (!session) throw new APIError('INTERNAL_SERVER_ERROR');
              await setSessionCookie(ctx, { session, user });
              return ctx.json({ success: true });
            },
          ),
        },
      },
    ],
  });
}

export type NuxionAuth = Awaited<ReturnType<typeof createBetterAuth>>;
