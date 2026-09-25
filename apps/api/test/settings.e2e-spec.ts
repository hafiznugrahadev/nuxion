import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { eq } from 'drizzle-orm';
import { settings } from '../src/db/schema';
import { RedisService } from '@infrastructure/redis/redis.service';
import { createTestApp, extractAccessToken, getDb, SEED_USERS } from './helpers/app.helper';

// Rapid repeated logins; the suite hits /settings/branding often too.
process.env.THROTTLE_DISABLED = 'true';

describe('Settings (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;
  let superAdminToken: string;
  let adminToken: string;

  const DEFAULT_VALUE = { appName: 'Nuxion', logoUrl: null, faviconUrl: null };

  const resetBranding = async () => {
    const db = await getDb(app);
    await db
      .insert(settings)
      .values({ key: 'branding', value: DEFAULT_VALUE })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: DEFAULT_VALUE, updatedAt: new Date() },
      });
    // Direct DB writes bypass the service — drop the read cache too, or the
    // next suite run within the 60s TTL sees this suite's leftover values.
    await app.get(RedisService).del('settings:branding');
  };

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();

    const [superAdmin, admin] = await Promise.all([
      request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.superAdmin.email, password: SEED_USERS.superAdmin.password }),
      request(server)
        .post('/api/auth/login')
        .send({ email: SEED_USERS.admin.email, password: SEED_USERS.admin.password }),
    ]);
    superAdminToken = extractAccessToken(superAdmin.body);
    adminToken = extractAccessToken(admin.body);
  });

  afterAll(async () => {
    await resetBranding();
    await app.close();
  });

  describe('GET /api/settings/branding', () => {
    it('is public and returns the branding group', async () => {
      const res = await request(server).get('/api/settings/branding').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.appName).toBeTruthy();
      expect(res.body.data).toHaveProperty('logoUrl');
      expect(res.body.data).toHaveProperty('faviconUrl');
    });

    it('returns defaults when the row is missing', async () => {
      const db = await getDb(app);
      await db.delete(settings).where(eq(settings.key, 'branding'));
      await app.get(RedisService).del('settings:branding');
      const res = await request(server).get('/api/settings/branding').expect(200);
      expect(res.body.data).toEqual({ appName: 'Nuxion', logoUrl: null, faviconUrl: null });
    });
  });

  describe('PUT /api/settings/branding', () => {
    it('rejects unauthenticated calls', async () => {
      await request(server).put('/api/settings/branding').send({ appName: 'Nope' }).expect(401);
    });

    it('rejects ADMIN (Super Admin only)', async () => {
      await request(server)
        .put('/api/settings/branding')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ appName: 'Nope' })
        .expect(403);
    });

    it('rejects invalid payloads', async () => {
      await request(server)
        .put('/api/settings/branding')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ appName: 'x' })
        .expect(400);
      await request(server)
        .put('/api/settings/branding')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ appName: 'Acme', logoUrl: 'not-a-url' })
        .expect(400);
    });

    it('persists as Super Admin and serves the update', async () => {
      const put = await request(server)
        .put('/api/settings/branding')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          appName: 'Acme Corp',
          logoUrl: null,
          faviconUrl: 'http://api.local/uploads/branding/fav.png',
        })
        .expect(200);
      expect(put.body.data.appName).toBe('Acme Corp');

      // Public read reflects the change (cache was invalidated).
      const get = await request(server).get('/api/settings/branding').expect(200);
      expect(get.body.data).toEqual({
        appName: 'Acme Corp',
        logoUrl: null,
        faviconUrl: 'http://api.local/uploads/branding/fav.png',
      });
    });
  });
});
