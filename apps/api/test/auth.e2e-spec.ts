import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  extractAccessToken,
  extractRefreshCookie,
  SEED_USERS,
} from './helpers/app.helper';

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
    it('returns 200 with accessToken and sets refresh cookie on valid credentials', async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: SEED_USERS.admin.password })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe(SEED_USERS.admin.email);

      const cookie = extractRefreshCookie(res.headers as Record<string, string | string[]>);
      expect(cookie).toMatch(/^refresh_token=/);
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

  // ── POST /api/auth/refresh ────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    let refreshCookie: string;

    beforeEach(async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.user.email, password: SEED_USERS.user.password });
      refreshCookie = extractRefreshCookie(res.headers as Record<string, string | string[]>);
    });

    it('returns 200 with a new accessToken when refresh cookie is valid', async () => {
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeTruthy();
      const newCookie = extractRefreshCookie(res.headers as Record<string, string | string[]>);
      expect(newCookie).toMatch(/^refresh_token=/);
    });

    it('returns 401 when no refresh cookie is sent', async () => {
      const res = await request(server).post('/api/auth/refresh').expect(401);
      expect(res.body.success).toBe(false);
    });

    it('returns 401 when refresh cookie is garbage', async () => {
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', 'refresh_token=invalid-token-value')
        .expect(401);
      expect(res.body.success).toBe(false);
    });

    it('detects reuse: second use of same token returns 401', async () => {
      // Use the token once to rotate it.
      await request(server).post('/api/auth/refresh').set('Cookie', refreshCookie).expect(200);

      // The original token is now revoked — reusing it triggers family wipe.
      const res = await request(server)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── POST /api/auth/logout ─────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('returns 200 and clears the cookie on logout', async () => {
      const loginRes = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.user.email, password: SEED_USERS.user.password });
      const cookie = extractRefreshCookie(loginRes.headers as Record<string, string | string[]>);

      const logoutRes = await request(server)
        .post('/api/auth/logout')
        .set('Cookie', cookie)
        .expect(200);

      expect(logoutRes.body.success).toBe(true);
      // Set-Cookie should contain an expired / empty refresh_token.
      const clearCookie = extractRefreshCookie(
        logoutRes.headers as Record<string, string | string[]>,
      );
      expect(clearCookie).toMatch(/refresh_token=/);
    });

    it('returns 200 even without a refresh cookie (idempotent)', async () => {
      const res = await request(server).post('/api/auth/logout').expect(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── GET /api/auth/me ──────────────────────────────────────────────────────

  describe('GET /api/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: SEED_USERS.admin.password });
      accessToken = extractAccessToken(res.body as { data?: { accessToken?: string } });
    });

    it('returns 200 with current user info when authenticated', async () => {
      const res = await request(server)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
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
