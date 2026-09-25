import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/app.helper';

// Same default as app.config.ts when APP_URL is absent — the trusted origin
// the CSRF check must accept in these tests.
const trustedOrigin = process.env.APP_URL || 'http://localhost:4300';

describe('Security (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('security headers (Helmet-style defaults)', () => {
    it('sends the default protective headers on route responses', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['cross-origin-opener-policy']).toBe('same-origin');
      expect(res.headers['origin-agent-cluster']).toBe('?1');
      expect(res.headers['strict-transport-security']).toContain('max-age=31536000');
      expect(res.headers['content-security-policy']).toContain("default-src 'self'");
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('relaxes CORP to cross-origin for API-served assets (uploads)', async () => {
      const res = await request(app.getHttpServer()).get('/api/health').expect(200);

      expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    });
  });

  describe('CSRF protection (fetch-metadata)', () => {
    const credentials = { email: 'csrf-probe@nuxion.test', password: 'irrelevant' };

    it('rejects a state-changing request the browser reports as cross-site', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .send(credentials);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/cross-origin/i);
    });

    it('rejects same-site requests too (only same-origin is trusted)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Sec-Fetch-Site', 'same-site')
        .send(credentials);

      expect(res.status).toBe(403);
    });

    it('allows the request when its origin is trusted (the web app)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', trustedOrigin)
        .send(credentials);

      // CSRF passed; the login itself fails on bad credentials, not on 403.
      expect(res.status).toBe(401);
    });

    it('lets non-browser clients through (no Sec-Fetch-Site/Origin)', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/login').send(credentials);

      expect(res.status).toBe(401);
    });

    it('never checks safe methods (GET passes without origin headers)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Sec-Fetch-Site', 'cross-site')
        .set('Origin', 'https://evil.example')
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});
