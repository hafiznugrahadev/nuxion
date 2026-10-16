import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { like } from 'drizzle-orm';
import { passwordResetTokens, users } from '../src/db/schema';
import type { Database } from '../src/db/relations';
import { generateOpaqueToken, hashToken } from '../src/common/utils/token.util';
import {
  createTestApp,
  extractAccessToken,
  extractRefreshCookie,
  getDb,
  SEED_USERS,
} from './helpers/app.helper';

process.env.THROTTLE_DISABLED = 'true';
process.env.AUTH_2FA_ENABLED = 'false';

const password = 'Dummy-session-password-1!';
const replacement = 'Dummy-session-password-2!';
const prefix = 'e2e-session-security-';

describe('Session security (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let db: Database;
  let manager: string;
  let userId: string;
  let email: string;
  let sequence = 0;

  const login = (value = password) =>
    request(server).post('/api/auth/login').send({ email, password: value });
  const refresh = (cookie: string) =>
    request(server).post('/api/auth/refresh').set('Cookie', cookie);
  const profile = (token: string) =>
    request(server).get('/api/users/me').set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    db = await getDb(app);
    const response = await request(server)
      .post('/api/auth/login')
      .send(SEED_USERS.superAdmin)
      .expect(200);
    manager = extractAccessToken(response.body);
  });
  beforeEach(async () => {
    email = `${prefix}${Date.now()}-${sequence++}@example.test`;
    const created = await request(server)
      .post('/api/users')
      .set('Authorization', `Bearer ${manager}`)
      .send({ name: 'Session fixture', email, password, roles: ['ADMIN'] })
      .expect(201);
    userId = created.body.data.id;
  });
  afterAll(async () => {
    await db.delete(users).where(like(users.email, `${prefix}%`));
    await app.close();
  });

  it('rejects old access and refresh after a self-service password change', async () => {
    const session = await login().expect(200);
    const access = extractAccessToken(session.body);
    const cookie = extractRefreshCookie(session.headers);
    await request(server)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${access}`)
      .send({ currentPassword: password, newPassword: replacement })
      .expect(200);
    await profile(access).expect(401);
    await refresh(cookie).expect(401);
    await login().expect(401);
    const current = await login(replacement).expect(200);
    await profile(extractAccessToken(current.body)).expect(200);
  });

  it('revokes sessions on administrative password replacement and role replacement', async () => {
    let session = await login().expect(200);
    await request(server)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${manager}`)
      .send({ password: replacement })
      .expect(200);
    await profile(extractAccessToken(session.body)).expect(401);
    await refresh(extractRefreshCookie(session.headers)).expect(401);
    session = await login(replacement).expect(200);
    await request(server)
      .patch(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${manager}`)
      .send({ roles: ['USER'] })
      .expect(200);
    await request(server)
      .get('/api/users')
      .set('Authorization', `Bearer ${extractAccessToken(session.body)}`)
      .expect(401);
    await refresh(extractRefreshCookie(session.headers)).expect(401);
    const downgraded = await login(replacement).expect(200);
    await profile(extractAccessToken(downgraded.body)).expect(200);
    await request(server)
      .get('/api/users')
      .set('Authorization', `Bearer ${extractAccessToken(downgraded.body)}`)
      .expect(403);
  });

  it('rejects deleted identities and invalidates access when its family logs out', async () => {
    const session = await login().expect(200);
    await request(server)
      .post('/api/auth/logout')
      .set('Cookie', extractRefreshCookie(session.headers))
      .expect(200);
    await profile(extractAccessToken(session.body)).expect(401);
    const independent = await login().expect(200);
    await request(server)
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${manager}`)
      .expect(200);
    await request(server)
      .get('/api/users')
      .set('Authorization', `Bearer ${extractAccessToken(independent.body)}`)
      .expect(401);
    await refresh(extractRefreshCookie(independent.headers)).expect(401);
  });

  it('allows exactly one concurrent refresh and revokes the reused family', async () => {
    const session = await login().expect(200);
    const cookie = extractRefreshCookie(session.headers);
    const responses = await Promise.all([refresh(cookie), refresh(cookie)]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 401]);
    const winner = responses.find((r) => r.status === 200)!;
    await profile(extractAccessToken(winner.body)).expect(401);
    await refresh(extractRefreshCookie(winner.headers)).expect(401);
    const clean = await login().expect(200);
    await profile(extractAccessToken(clean.body)).expect(200);
  });

  it('consumes a reset token once under concurrent requests', async () => {
    const raw = generateOpaqueToken();
    await db
      .insert(passwordResetTokens)
      .values({ userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60_000) });
    const reset = () =>
      request(server)
        .post('/api/auth/reset-password')
        .send({ token: raw, newPassword: replacement });
    const responses = await Promise.all([reset(), reset()]);
    expect(responses.map((r) => r.status).sort()).toEqual([200, 400]);
    await login().expect(401);
    const session = await login(replacement).expect(200);
    await profile(extractAccessToken(session.body)).expect(200);
  });

  it('cannot resurrect a session by racing password reset against refresh', async () => {
    const session = await login().expect(200);
    const raw = generateOpaqueToken();
    await db
      .insert(passwordResetTokens)
      .values({ userId, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 60_000) });
    const [rotated, reset] = await Promise.all([
      refresh(extractRefreshCookie(session.headers)),
      request(server)
        .post('/api/auth/reset-password')
        .send({ token: raw, newPassword: replacement }),
    ]);
    expect(reset.status).toBe(200);
    expect([200, 401]).toContain(rotated.status);
    await profile(extractAccessToken(session.body)).expect(401);
    if (rotated.status === 200) {
      await profile(extractAccessToken(rotated.body)).expect(401);
      await refresh(extractRefreshCookie(rotated.headers)).expect(401);
    }
    const current = await login(replacement).expect(200);
    await profile(extractAccessToken(current.body)).expect(200);
  });
});
