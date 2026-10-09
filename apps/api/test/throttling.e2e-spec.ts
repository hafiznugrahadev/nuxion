import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/app.helper';

// The ONLY e2e spec that runs with rate limiting ON (every other spec disables
// it via THROTTLE_DISABLED). Vitest isolates spec files in separate workers, so
// these env mutations cannot leak elsewhere; setting them explicitly also beats
// a root .env that happens to carry THROTTLE_* values (dotenv never overrides
// real env vars). The global limit is shrunk to 3 so the default-throttler test
// needs 4 requests instead of 101; per-route @Throttle overrides (login's 5/min)
// still apply exactly as declared on the controller.
process.env.THROTTLE_DISABLED = 'false';
process.env.THROTTLE_LIMIT = '3';

// Well-formed but wrong credentials: each request counts toward the throttle
// while the handler answers 401, so the limit is exercised by real requests.
const badCredentials = { email: 'throttle-probe@nuxion.test', password: 'wrong-password' };

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;
  let server: ReturnType<INestApplication['getHttpServer']>;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
  });

  it('applies the global default limit to routes without @Throttle', async () => {
    for (let i = 0; i < 3; i += 1) {
      const res = await request(server).get('/api/health').expect(200);
      expect(res.body.success).toBe(true);
    }

    const blocked = await request(server).get('/api/health');
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.statusCode).toBe(429);
    expect(blocked.body.message).toMatch(/too many requests/i);
    expect(blocked.headers['retry-after']).toBeTruthy();
  });

  it('lets a per-route @Throttle override replace the global limit', async () => {
    // Login carries @Throttle 5/min while this spec's global limit is stricter
    // (3): requests 4 and 5 still pass, proving the decorator REPLACES the root
    // options for that route instead of being capped by them.
    for (let i = 0; i < 5; i += 1) {
      await request(server).post('/api/auth/login').send(badCredentials).expect(401);
    }

    const blocked = await request(server).post('/api/auth/login').send(badCredentials);
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.message).toMatch(/too many requests/i);
    expect(blocked.headers['retry-after']).toBeTruthy();
  });

  it('tracks buckets per route — a blocked route does not block others', async () => {
    // Login is exhausted above; another route from the same client IP still
    // answers normally (401: missing token — not 429).
    const res = await request(server).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.statusCode).toBe(401);
  });
});
