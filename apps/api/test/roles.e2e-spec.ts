import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { eq, inArray, like } from 'drizzle-orm';
import { roles, users } from '../src/db/schema';
import type { Database } from '../src/db/relations';
import {
  createTestApp,
  extractAccessToken,
  getDb,
  E2E_PREFIX,
  SEED_USERS,
} from './helpers/app.helper';

/** Login shorthand returning a Bearer token string. */
async function loginAs(
  server: ReturnType<INestApplication['getHttpServer']>,
  email: string,
  password: string,
): Promise<string> {
  const res = await request(server).post('/api/auth/login').send({ email, password });
  return extractAccessToken(res.body as { data?: { accessToken?: string } });
}

/** UPPER_SNAKE_CASE name that satisfies the DTO pattern (E2E_PREFIX is lowercase). */
const CUSTOM_ROLE = 'E2E_TEST_ROLE';
const RENAME_SOURCE = 'E2E_RENAME_ME';
const RENAMED_ROLE = 'E2E_RENAMED_ROLE';

describe('Roles (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let db: Database;

  let superAdminToken: string;
  let adminToken: string;
  let userToken: string;
  let superAdminRoleId: string;
  let customRoleId: string;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
    db = await getDb(app);

    [superAdminToken, adminToken, userToken] = await Promise.all([
      loginAs(server, SEED_USERS.superAdmin.email, SEED_USERS.superAdmin.password),
      loginAs(server, SEED_USERS.admin.email, SEED_USERS.admin.password),
      loginAs(server, SEED_USERS.user.email, SEED_USERS.user.password),
    ]);
  });

  afterAll(async () => {
    // Remove e2e-created users and roles so the DB stays clean.
    await db.delete(users).where(like(users.email, `${E2E_PREFIX}%`));
    await db.delete(roles).where(inArray(roles.name, [CUSTOM_ROLE, RENAME_SOURCE, RENAMED_ROLE]));
    await app.close();
  });

  // ── GET /api/roles ─────────────────────────────────────────────────────────

  describe('GET /api/roles', () => {
    it('returns the catalog with holder counts for admin', async () => {
      const res = await request(server)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const names = res.body.data.map((r: { name: string }) => r.name);
      expect(names).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'ADMIN', 'USER']));
      for (const role of res.body.data) {
        expect(role).toHaveProperty('userCount');
      }
      superAdminRoleId = res.body.data.find((r: { name: string }) => r.name === 'SUPER_ADMIN').id;
    });

    it('returns 403 for a regular USER role', async () => {
      await request(server)
        .get('/api/roles')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('returns 401 without auth', async () => {
      await request(server).get('/api/roles').expect(401);
    });
  });

  // ── POST /api/roles ────────────────────────────────────────────────────────

  describe('POST /api/roles', () => {
    it('creates a custom role as SUPER_ADMIN', async () => {
      const res = await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: CUSTOM_ROLE })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(CUSTOM_ROLE);
      expect(res.body.data.userCount).toBe(0);
      customRoleId = res.body.data.id;
    });

    it('returns 400 for a duplicate name (async IsUnique validation)', async () => {
      const res = await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: CUSTOM_ROLE })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('name already exists');
    });

    it('returns 400 for a well-known name (also an existing row)', async () => {
      const res = await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'ADMIN' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('name already exists');
    });

    it('returns 400 for a name that is not UPPER_SNAKE_CASE', async () => {
      await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'lowercase_role' })
        .expect(400);
    });

    it('returns 403 for ADMIN role (not SUPER_ADMIN)', async () => {
      await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'ADMIN_FORBIDDEN_TRY' })
        .expect(403);
    });
  });

  // ── Custom roles are assignable through the users endpoints ────────────────

  describe('custom role assignment via /api/users', () => {
    const holderEmail = `${E2E_PREFIX}role-holder@nuxion.test`;
    let holderId: string;

    it('assigns a custom role when creating a user', async () => {
      const res = await request(server)
        .post('/api/users')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: holderEmail,
          name: 'Custom Role Holder',
          password: 'holderpass1',
          roles: ['USER', CUSTOM_ROLE],
        })
        .expect(201);

      expect(res.body.data.roles).toEqual(expect.arrayContaining(['USER', CUSTOM_ROLE]));
      holderId = res.body.data.id;
    });

    it('filters the user list by a custom role name', async () => {
      const res = await request(server)
        .get(`/api/users?roles=${CUSTOM_ROLE}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data.every((u: { roles: string[] }) => u.roles.includes(CUSTOM_ROLE))).toBe(
        true,
      );
    });

    it('deleting the custom role un-assigns it from holders (cascade)', async () => {
      await request(server)
        .delete(`/api/roles/${customRoleId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      const res = await request(server)
        .get(`/api/users/${holderId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);

      expect(res.body.data.roles).not.toContain(CUSTOM_ROLE);
      expect(res.body.data.roles).toContain('USER');
    });
  });

  // ── PATCH /api/roles/:id ───────────────────────────────────────────────────

  describe('PATCH /api/roles/:id', () => {
    let renameTargetId: string;

    beforeAll(async () => {
      const created = await request(server)
        .post('/api/roles')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: RENAME_SOURCE });
      renameTargetId = created.body.data.id;
    });

    it('renames a custom role as SUPER_ADMIN', async () => {
      const res = await request(server)
        .patch(`/api/roles/${renameTargetId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: RENAMED_ROLE })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(RENAMED_ROLE);
    });

    it('returns 400 when renaming a built-in role', async () => {
      const res = await request(server)
        .patch(`/api/roles/${superAdminRoleId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'GOD_MODE' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('built-in role');
    });

    it('returns 409 when renaming to a name another role holds', async () => {
      const res = await request(server)
        .patch(`/api/roles/${renameTargetId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'USER' })
        .expect(409);

      expect(res.body.success).toBe(false);
    });

    it('returns 403 for ADMIN role (not SUPER_ADMIN)', async () => {
      await request(server)
        .patch(`/api/roles/${renameTargetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'ADMIN_TRIED_THIS' })
        .expect(403);
    });

    it('returns 404 for a non-existent uuid', async () => {
      await request(server)
        .patch('/api/roles/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ name: 'NOPE_ROLE' })
        .expect(404);
    });
  });

  // ── DELETE /api/roles/:id ──────────────────────────────────────────────────

  describe('DELETE /api/roles/:id', () => {
    it('returns 400 when deleting a built-in role', async () => {
      const res = await request(server)
        .delete(`/api/roles/${superAdminRoleId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('built-in role');
      // The seeded role must still exist.
      const [row] = await db.select().from(roles).where(eq(roles.id, superAdminRoleId));
      expect(row?.name).toBe('SUPER_ADMIN');
    });

    it('returns 403 for ADMIN role (not SUPER_ADMIN)', async () => {
      await request(server)
        .delete(`/api/roles/${superAdminRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });
});
