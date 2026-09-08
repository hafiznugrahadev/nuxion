import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './helpers/app.helper';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok with db and redis status', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      status: expect.stringMatching(/^(ok|degraded)$/),
      db: expect.any(String),
      redis: expect.any(String),
      uptime: expect.any(Number),
    });
  });
});
