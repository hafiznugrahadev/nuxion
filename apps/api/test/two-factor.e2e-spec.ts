import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { generate } from 'otplib';
import { createTestApp, extractAccessToken, getPrisma, SEED_USERS } from './helpers/app.helper';

// This suite exercises the mandatory-2FA mode; existing suites run with it off.
// Vitest isolates each spec file in its own worker, so these process.env writes
// cannot leak into auth.e2e-spec.ts. Throttling is off: the flow logs in a lot.
// PASSKEY is pinned off explicitly — the root .env may set it true (dev setup).
process.env.AUTH_2FA_ENABLED = 'true';
process.env.AUTH_PASSKEY_ENABLED = 'false';
process.env.THROTTLE_DISABLED = 'true';

const ADMIN = SEED_USERS.admin;

/** Reset the shared seed admin to a clean pre-2FA state. */
async function resetTwoFactor(app: INestApplication) {
  const prisma = await getPrisma(app);
  await prisma.user.update({
    where: { email: ADMIN.email },
    data: { twoFactorEnabled: false, twoFactorSecret: null, recoveryCodes: null },
  });
}

type TestServer = ReturnType<INestApplication['getHttpServer']>;

/** Not async — the supertest Test object must keep its .expect() chain. */
function login(server: TestServer) {
  return request(server)
    .post('/api/auth/login')
    .send({ email: ADMIN.email, password: ADMIN.password });
}

describe('Two-factor auth (e2e)', () => {
  let app: INestApplication;
  let server: TestServer;

  beforeAll(async () => {
    app = await createTestApp();
    server = app.getHttpServer();
  });

  afterAll(async () => {
    await resetTwoFactor(app);
    await app.close();
  });

  // The seed admin is shared state — every test starts from a clean pre-2FA account.
  beforeEach(async () => {
    await resetTwoFactor(app);
  });

  describe('while 2FA is not yet activated', () => {
    it('issues a full session right after password (middleware drives setup)', async () => {
      const res = await login(server).expect(200);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.twoFactorEnabled).toBe(false);
    });

    it('guards the setup endpoints behind authentication', async () => {
      await request(server).post('/api/auth/2fa/setup').expect(401);
    });
  });

  describe('setup + activate + challenge login', () => {
    let accessToken: string;

    beforeEach(async () => {
      const res = await login(server).expect(200);
      accessToken = extractAccessToken(res.body);
    });

    it('runs the complete happy path', async () => {
      // 1. Begin setup — QR material + manual secret.
      const setup = await request(server)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const secret = setup.body.data.secret;
      expect(setup.body.data.otpauthUrl).toContain(encodeURIComponent(secret));
      expect(setup.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);

      // 2. Confirm with a live code → recovery codes, shown once.
      const activate = await request(server)
        .post('/api/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: await generate({ secret }) })
        .expect(200);
      const recoveryCodes = activate.body.data.recoveryCodes;
      expect(recoveryCodes).toHaveLength(8);
      expect(activate.body.data.user.twoFactorEnabled).toBe(true);

      // 3. Login now stops at the challenge — no token, no cookie.
      const challenged = await login(server).expect(200);
      expect(challenged.body.data).toEqual({
        twoFactorRequired: true,
        challengeId: expect.any(String),
      });
      expect(challenged.body.data.accessToken).toBeUndefined();
      expect(challenged.headers['set-cookie']).toBeUndefined();

      // 4. Wrong codes burn the challenge…
      const challengeId = challenged.body.data.challengeId;
      for (let i = 0; i < 5; i++) {
        await request(server)
          .post('/api/auth/2fa/verify')
          .send({ challengeId, code: '000000' })
          .expect(401);
      }
      await request(server)
        .post('/api/auth/2fa/verify')
        .send({ challengeId, code: '000000' })
        .expect(400); // challenge gone → restart login

      // 5. …but a fresh login + valid code issues the session.
      const rechallenge = await login(server).expect(200);
      const verified = await request(server)
        .post('/api/auth/2fa/verify')
        .send({
          challengeId: rechallenge.body.data.challengeId,
          code: await generate({ secret }),
        })
        .expect(200);
      expect(verified.body.data.accessToken).toBeTruthy();
      expect(verified.body.data.user.twoFactorEnabled).toBe(true);
      expect(String(verified.headers['set-cookie'])).toMatch(/^refresh_token=/);
    });

    it('accepts a recovery code exactly once in place of a TOTP code', async () => {
      const setup = await request(server)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      const activate = await request(server)
        .post('/api/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: await generate({ secret: setup.body.data.secret }) })
        .expect(200);
      const [first, second] = activate.body.data.recoveryCodes;

      // Consume the first recovery code.
      const c1 = await login(server).expect(200);
      await request(server)
        .post('/api/auth/2fa/verify')
        .send({ challengeId: c1.body.data.challengeId, code: first })
        .expect(200);

      // Same code again → rejected (single-use)…
      const c2 = await login(server).expect(200);
      await request(server)
        .post('/api/auth/2fa/verify')
        .send({ challengeId: c2.body.data.challengeId, code: first })
        .expect(401);

      // …but the next code still works.
      const c3 = await login(server).expect(200);
      await request(server)
        .post('/api/auth/2fa/verify')
        .send({ challengeId: c3.body.data.challengeId, code: second })
        .expect(200);
    });

    it('regenerates recovery codes only with the correct password', async () => {
      const setup = await request(server)
        .post('/api/auth/2fa/setup')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      await request(server)
        .post('/api/auth/2fa/activate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ code: await generate({ secret: setup.body.data.secret }) })
        .expect(200);

      await request(server)
        .post('/api/auth/2fa/recovery/regenerate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'wrong-password' })
        .expect(401);

      const regen = await request(server)
        .post('/api/auth/2fa/recovery/regenerate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: ADMIN.password })
        .expect(200);
      expect(regen.body.data.recoveryCodes).toHaveLength(8);
    });
  });

  describe('passkey endpoints (flag off)', () => {
    it('refuse passkey operations with 403', async () => {
      const res = await login(server).expect(200);
      const token = extractAccessToken(res.body);
      await request(server)
        .post('/api/auth/webauthn/register/options')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      await request(server).post('/api/auth/webauthn/login/options').expect(403);
    });
  });
});
