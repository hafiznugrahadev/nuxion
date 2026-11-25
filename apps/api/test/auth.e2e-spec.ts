import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, extractSessionCookie, SEED_USERS } from './helpers/app.helper';

// The suite logs in far more than the 5/60s per-route login throttle allows.
// Vitest isolates spec files in separate workers, so this cannot leak elsewhere.
process.env.THROTTLE_DISABLED = 'true';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  // ── POST /api/auth/login ──────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('sets an HttpOnly session cookie without exposing credentials on valid login', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: SEED_USERS.admin.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(extractSessionCookie(res.headers)).toBeTruthy();
      expect(res.body.data.user.email).toBe(SEED_USERS.admin.email);
      expect(res.body.data).not.toHaveProperty('accessToken');
      expect(String(res.headers['set-cookie'])).toContain('HttpOnly');

      const cookie = extractSessionCookie(res.headers as Record<string, string | string[]>);
      expect(cookie).toMatch(/better-auth\.session_token=/);
    });

    it('returns 401 with wrong password', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: 'wrongpassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 401 for non-existent user', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'nobody@nuxion.test', password: 'password123' })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ password: 'admin123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: 'abc' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'admin123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/auth/session ────────────────────────────────────────────────

  describe('GET /api/auth/session', () => {
    let sessionCookie: string;

    beforeEach(async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.user.email, password: SEED_USERS.user.password });
      sessionCookie = extractSessionCookie(res.headers as Record<string, string | string[]>);
    });

    it('restores the user from a valid session cookie', async () => {
      const res = await request(server)
        .get('/api/auth/session')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(SEED_USERS.user.email);
      expect(res.body.data.accessToken).toBeUndefined();
    });

    it('returns 401 when no session cookie is sent', async () => {
      const res = await request(server).get('/api/auth/session').expect(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when session cookie is garbage', async () => {
      const res = await request(server)
        .get('/api/auth/session')
        .set('Cookie', 'better-auth.session_token=invalid-token-value')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('keeps a valid server session usable across concurrent restoration calls', async () => {
      const responses = await Promise.all([
        request(server).get('/api/auth/session').set('Cookie', sessionCookie),
        request(server).get('/api/auth/session').set('Cookie', sessionCookie),
      ]);
      expect(responses.map((response) => response.status)).toEqual([200, 200]);
    });
  });

  // ── POST /api/auth/logout ─────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('returns 200 and clears the cookie on logout', async () => {
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.user.email, password: SEED_USERS.user.password });
      const cookie = extractSessionCookie(loginRes.headers as Record<string, string | string[]>);

      const logoutRes = await request(server)
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      expect(logoutRes.body.success).toBe(true);
      // Logout expires the signed session cookie.
      const clearCookie = extractSessionCookie(
        logoutRes.headers as Record<string, string | string[]>,
      );
      expect(clearCookie).toMatch(/better-auth\.session_token=/);
      await request(server).get('/api/auth/session').set('Cookie', cookie).expect(401);
    });

    it('returns 200 even without a session cookie (idempotent)', async () => {
      const res = await request(server).post('/api/auth/logout').expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  it('does not expose native sign-in or server-only session issuance', async () => {
    for (const path of ['sign-in/email', 'issue-verified-session']) {
      const response = await request(server).post(`/api/auth/${path}`).send({ userId: 'anything' });
      expect([401, 404]).toContain(response.status);
      expect(response.headers['set-cookie']).toBeUndefined();
    }
  });

  // ── GET /api/auth/me ──────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    let sessionCookie: string;

    beforeAll(async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: SEED_USERS.admin.password });
      sessionCookie = extractSessionCookie(res.headers);
    });

    it('returns 200 with current user info when authenticated', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(SEED_USERS.admin.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('returns 401 without a token', async () => {
      const res = await request(server).get('/api/auth/me').expect(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 with a malformed token', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not.a.real.jwt')
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });
});
