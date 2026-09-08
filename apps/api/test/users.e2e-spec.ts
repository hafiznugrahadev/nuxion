import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  extractAccessToken,
  getPrisma,
  E2E_PREFIX,
  SEED_USERS,
} from './helpers/app.helper';
import type { PrismaService } from '../src/infrastructure/database/prisma.service';

/** Login shorthand returning a Bearer token string. */
async function loginAs(
  server: ReturnType<INestApplication['getHttpServer']>,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(server).post('/api/auth/login').send({ email, password });
  return extractAccessToken(res.body as { data?: { accessToken?: string } });
}

describe('Users (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let prisma: PrismaService;

  let superAdminToken: string;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    prisma = await getPrisma(app);

    [superAdminToken, adminToken, userToken] = await Promise.all([
      loginAs(server, SEED_USERS.superAdmin.email, SEED_USERS.superAdmin.password),
      loginAs(server, SEED_USERS.admin.email, SEED_USERS.admin.password),
      loginAs(server, SEED_USERS.user.email, SEED_USERS.user.password),
    ]);
  });

  afterAll(async () => {
    // Remove any e2e-created users so the DB stays clean.
    await prisma.user.deleteMany({ where: { email: { startsWith: E2E_PREFIX } } });
    await app.close();
  });

  // ── GET /api/users/me ─────────────────────────────────────────────────────

  describe('GET /api/users/me', () => {
    it('returns the current user profile', async () => {
      const res = await request(server)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(SEED_USERS.user.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('returns 401 without auth', async () => {
      await request(server).get('/api/users/me').expect(401);
    });
  });

  // ── PATCH /api/users/me ───────────────────────────────────────────────────

  describe('PATCH /api/users/me', () => {
    it('updates the current user name', async () => {
      const res = await request(server)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated Name');
    });

    it('returns 400 when name is empty', async () => {
      const res = await request(server)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: '' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when extra fields are sent (whitelist)', async () => {
      const res = await request(server)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Valid Name', roles: ['SUPER_ADMIN'] })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── PATCH /api/users/me/password ─────────────────────────────────────────

  describe('PATCH /api/users/me/password', () => {
    const originalPassword = SEED_USERS.user.password;
    const tempPassword = `${E2E_PREFIX}newPass1!`;

    afterEach(async () => {
      // Restore original password after each test so subsequent tests still work.
      await request(server)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: tempPassword, newPassword: originalPassword });
    });

    it('changes the password with correct current password', async () => {
      const res = await request(server)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: originalPassword, newPassword: tempPassword })
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 401 when current password is wrong', async () => {
      const res = await request(server)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: 'wrongpassword', newPassword: tempPassword })
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 when new password is too short', async () => {
      const res = await request(server)
        .patch('/api/users/me/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ currentPassword: originalPassword, newPassword: '123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/users ────────────────────────────────────────────────────────

  describe('GET /api/users', () => {
    it('returns paginated list for admin', async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta).toMatchObject({
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      });
    });

    it('supports pagination query params', async () => {
      const res = await request(server)
        .get('/api/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('supports search by email', async () => {
      const res = await request(server)
        .get('/api/users?search=admin%40nuxion')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.every((u: { email: string }) => u.email.includes('admin'))).toBe(true);
    });

    it('returns 403 for a regular USER role', async () => {
      await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns 401 without auth', async () => {
      await request(server).get('/api/users').expect(401);
    });
  });

  // ── POST /api/users ───────────────────────────────────────────────────────

  describe('POST /api/users', () => {
    const newUser = {
      email: `${E2E_PREFIX}create@nuxion.test`,
      name: 'E2E Created User',
      password: 'createpassword1',
      roles: ['USER'],
    };

    afterAll(async () => {
      await prisma.user.deleteMany({ where: { email: newUser.email } });
    });

    it('creates a user as SUPER_ADMIN', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(newUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(newUser.email);
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('returns 409 when email already exists', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(newUser)
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for missing required fields', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ email: `${E2E_PREFIX}nopwd@nuxion.test` })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 403 for ADMIN role (not SUPER_ADMIN)', async () => {
      await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...newUser, email: `${E2E_PREFIX}admin-try@nuxion.test` })
        .expect(403);
    });
  });

  // ── GET /api/users/:id ────────────────────────────────────────────────────

  describe('GET /api/users/:id', () => {
    let targetUserId: string;

    beforeAll(async () => {
      const res = await request(server)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);
      targetUserId = res.body.data[0]?.id;
    });

    it('returns user by id for admin', async () => {
      const res = await request(server)
        .get(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(targetUserId);
    });

    it('returns 404 for a non-existent uuid', async () => {
      const res = await request(server)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('returns 400 for a malformed uuid', async () => {
      const res = await request(server)
        .get('/api/users/not-a-uuid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('returns 403 for regular USER role', async () => {
      await request(server)
        .get(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  // ── PATCH /api/users/:id ──────────────────────────────────────────────────

  describe('PATCH /api/users/:id', () => {
    let targetUserId: string;

    beforeAll(async () => {
      const created = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: `${E2E_PREFIX}patch-target@nuxion.test`,
          name: 'Patch Target',
          password: 'patchpass1',
          roles: ['USER'],
        });
      targetUserId = created.body.data.id;
    });

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: `${E2E_PREFIX}patch-target@nuxion.test` },
      });
    });

    it('updates user name as SUPER_ADMIN', async () => {
      const res = await request(server)
        .patch(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'Updated by E2E' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Updated by E2E');
    });

    it('returns 403 for ADMIN role (not SUPER_ADMIN)', async () => {
      await request(server)
        .patch(`/api/users/${targetUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Attempted update' })
        .expect(403);
    });
  });

  // ── DELETE /api/users/:id ─────────────────────────────────────────────────

  describe('DELETE /api/users/:id', () => {
    let deletableUserId: string;

    beforeEach(async () => {
      const created = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: `${E2E_PREFIX}delete-me@nuxion.test`,
          name: 'Delete Me',
          password: 'deleteme1',
          roles: ['USER'],
        });
      deletableUserId = created.body.data.id;
    });

    afterEach(async () => {
      await prisma.user.deleteMany({ where: { email: `${E2E_PREFIX}delete-me@nuxion.test` } });
    });

    it('deletes a user as SUPER_ADMIN', async () => {
      const res = await request(server)
        .delete(`/api/users/${deletableUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });

    it('returns 403 for ADMIN role (not SUPER_ADMIN)', async () => {
      await request(server)
        .delete(`/api/users/${deletableUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('returns 404 after deletion', async () => {
      await request(server)
        .delete(`/api/users/${deletableUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      await request(server)
        .get(`/api/users/${deletableUserId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(404);
    });
  });
});
