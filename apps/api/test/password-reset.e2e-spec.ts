import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { eq, inArray } from 'drizzle-orm';
import { users, authVerifications } from '../src/db/schema';
import { UsersService } from '../src/modules/users/users.service';
import { MailService } from '../src/infrastructure/mail/mail.service';
import type { MailMessage } from '../src/infrastructure/mail/mail.types';
import type { Database } from '../src/db/relations';
import { createTestApp, extractSessionCookie, getDb, E2E_PREFIX } from './helpers/app.helper';

process.env.THROTTLE_DISABLED = 'true';
process.env.AUTH_2FA_ENABLED = 'false';

describe('Better Auth password reset (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let server: ReturnType<INestApplication['getHttpServer']>;
  const email = `${E2E_PREFIX}MixedCase@Example.test`;
  const collisionEmail = email.toLowerCase();
  const originalPassword = 'OriginalPassword123!';
  const newPassword = 'ReplacementPassword123!';
  const messages: MailMessage[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    db = await getDb(app);
    server = app.getHttpServer();
    await db.delete(users).where(inArray(users.email, [email, collisionEmail]));
    const service = app.get(UsersService);
    await service.create({
      email,
      name: 'Mixed case',
      password: originalPassword,
      roles: ['USER'],
    });
    await service.create({
      email: collisionEmail,
      name: 'Lower case',
      password: originalPassword,
      roles: ['USER'],
    });
    vi.spyOn(app.get(MailService), 'send').mockImplementation(async (message) => {
      messages.push(message);
    });
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await db.delete(users).where(inArray(users.email, [email, collisionEmail]));
    await app.close();
  });

  async function requestReset(target: string) {
    await request(server).post('/api/auth/forgot-password').send({ email: target }).expect(200);
    const message = messages.at(-1);
    const match = message?.text?.match(/https?:\/\/\S+\?token=([^\s]+)/);
    expect(message?.to).toBe(target);
    if (!match) throw new Error('Reset email did not include a token');
    return match[1];
  }

  it('preserves exact-case legacy accounts, replaces the password and revokes every old session', async () => {
    const login = await request(server)
      .post('/api/auth/login')
      .send({ email, password: originalPassword })
      .expect(200);
    const oldCookie = extractSessionCookie(login.headers);
    const token = await requestReset(email);

    await request(server).post('/api/auth/reset-password').send({ token, newPassword }).expect(200);

    await request(server).get('/api/auth/session').set('Cookie', oldCookie).expect(401);
    await request(server)
      .post('/api/auth/login')
      .send({ email, password: originalPassword })
      .expect(401);
    await request(server)
      .post('/api/auth/login')
      .send({ email, password: newPassword })
      .expect(200);
    await request(server)
      .post('/api/auth/login')
      .send({ email: collisionEmail, password: originalPassword })
      .expect(200);
    await request(server)
      .post('/api/auth/reset-password')
      .send({ token, newPassword: originalPassword })
      .expect(400);
  });

  it('invalidates the previous reset link when another reset is requested', async () => {
    const oldToken = await requestReset(collisionEmail);
    const currentToken = await requestReset(collisionEmail);
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, collisionEmail));

    await request(server)
      .post('/api/auth/reset-password')
      .send({ token: oldToken, newPassword })
      .expect(400);

    const records = await db
      .select()
      .from(authVerifications)
      .where(eq(authVerifications.value, user.id));
    expect(records).toHaveLength(1);
    expect(records[0].identifier).not.toContain(currentToken);
    await request(server)
      .post('/api/auth/reset-password')
      .send({ token: currentToken, newPassword })
      .expect(200);
  });

  it('returns the same response for known and unknown email addresses', async () => {
    const known = await request(server)
      .post('/api/auth/forgot-password')
      .send({ email })
      .expect(200);
    const count = messages.length;

    const unknown = await request(server)
      .post('/api/auth/forgot-password')
      .send({ email: 'missing-reset@example.test' })
      .expect(200);

    expect(unknown.body).toEqual(known.body);
    expect(messages).toHaveLength(count);
  });
});
