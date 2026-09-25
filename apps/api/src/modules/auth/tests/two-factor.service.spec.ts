import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { generate, generateSecret } from 'otplib';
import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '@infrastructure/redis/redis.service';
import { mockDb } from '../../../../test/helpers/mock-db';
import { TwoFactorService } from '../two-factor.service';

const USER_ID = 'user-1';
const JWT_SECRET = 'unit-test-secret-at-least-16-chars';

/** Database user shape as the service consumes it (roles attached by the service). */
const dbUser = (overrides: Record<string, unknown> = {}) => ({
  id: USER_ID,
  email: 'admin@nuxion.test',
  name: 'Admin',
  avatarUrl: null,
  password: 'bcrypt-hash',
  twoFactorEnabled: false,
  twoFactorSecret: null,
  recoveryCodes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/** Session-shaped row returned by the activate update + roles select. */
const updatedUser = {
  id: USER_ID,
  email: 'admin@nuxion.test',
  name: 'Admin',
  avatarUrl: null,
  twoFactorEnabled: true,
};

function makeService(options: { update?: unknown[] } = {}) {
  const mock = mockDb({ update: options.update });
  const store = new Map<string, unknown>();
  const redis = {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    del: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  };
  const config = {
    get: vi.fn((key: string) => (key === 'app.twoFactor.enabled' ? true : undefined)),
    getOrThrow: vi.fn((key: string) => {
      if (key === 'app.jwt.secret') return JWT_SECRET;
      throw new Error(`unexpected getOrThrow: ${key}`);
    }),
  };
  const service = new TwoFactorService(
    mock.db,
    redis as unknown as RedisService,
    config as unknown as ConfigService,
  );
  return { ...mock, service, redis, store };
}

describe('TwoFactorService', () => {
  let ctx: ReturnType<typeof makeService>;

  beforeEach(() => {
    ctx = makeService();
  });

  describe('beginSetup', () => {
    it('parks the pending secret in Redis and returns QR material', async () => {
      ctx.setSelectRows([{ twoFactorEnabled: false }]);
      const result = await ctx.service.beginSetup({ id: USER_ID, email: 'admin@nuxion.test' });

      expect(result.secret).toMatch(/^[A-Z2-7]+$/);
      expect(result.otpauthUrl).toContain('otpauth://totp/');
      expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(ctx.store.get(`2fa:setup:${USER_ID}`)).toEqual({ secret: result.secret });
    });

    it('refuses to restart setup when already enabled', async () => {
      ctx.setSelectRows([{ twoFactorEnabled: true }]);
      await expect(
        ctx.service.beginSetup({ id: USER_ID, email: 'admin@nuxion.test' }),
      ).rejects.toMatchObject({ status: 409 });
    });
  });

  describe('activate', () => {
    it('persists the secret encrypted and returns 8 single-use recovery codes', async () => {
      const secret = generateSecret();
      ctx = makeService({ update: [updatedUser] });
      ctx.store.set(`2fa:setup:${USER_ID}`, { secret });
      const code = await generate({ secret });

      const result = await ctx.service.activate({ id: USER_ID }, code);

      expect(result.recoveryCodes).toHaveLength(8);
      expect(result.recoveryCodes.every((c) => /^[A-Z2-9]{5}-[A-Z2-9]{5}$/.test(c))).toBe(true);
      expect(result.user.twoFactorEnabled).toBe(true);

      const persisted = ctx.calls.set?.[0] as Record<string, unknown>;
      // Secret must be encrypted at rest (not the plaintext base32 value).
      expect(persisted.twoFactorSecret).not.toBe(secret);
      expect(String(persisted.twoFactorSecret)).toMatch(
        /^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/,
      );
      // Recovery codes are stored as SHA-256 hashes, never plaintext.
      const hashes: string[] = JSON.parse(persisted.recoveryCodes as string);
      expect(hashes).toHaveLength(8);
      expect(hashes).not.toEqual(expect.arrayContaining(result.recoveryCodes));
      expect(ctx.store.has(`2fa:setup:${USER_ID}`)).toBe(false);
    });

    it('rejects a wrong confirmation code', async () => {
      ctx.store.set(`2fa:setup:${USER_ID}`, { secret: generateSecret() });
      await expect(ctx.service.activate({ id: USER_ID }, '000000')).rejects.toMatchObject({
        status: 401,
      });
    });

    it('rejects activation without a pending setup (expired)', async () => {
      await expect(ctx.service.activate({ id: USER_ID }, '123456')).rejects.toMatchObject({
        status: 400,
      });
    });
  });

  describe('verifyLoginChallenge', () => {
    it('accepts a valid TOTP code and consumes the challenge', async () => {
      const secret = generateSecret();
      ctx.store.set('2fa:challenge:c1', {
        userId: USER_ID,
        attempts: 0,
        expiresAt: Date.now() + 60_000,
      });
      ctx.setSelectRows([
        dbUser({ twoFactorEnabled: true, twoFactorSecret: encryptFor(ctx.service, secret) }),
      ]);
      ctx.thenSelectRows([{ name: 'ADMIN' }]);

      const user = await ctx.service.verifyLoginChallenge('c1', await generate({ secret }));

      expect(user.id).toBe(USER_ID);
      expect(user.roles).toEqual([{ name: 'ADMIN' }]);
      expect(ctx.store.has('2fa:challenge:c1')).toBe(false);
    });

    it('accepts a recovery code exactly once and removes it from the list', async () => {
      const code = 'ABCDE-23456';
      const remaining = ['FFFFF-GGGGH', 'HHHHH-JJJJK'];
      ctx.store.set('2fa:challenge:c2', {
        userId: USER_ID,
        attempts: 0,
        expiresAt: Date.now() + 60_000,
      });
      ctx.setSelectRows([
        dbUser({
          twoFactorEnabled: true,
          twoFactorSecret: encryptFor(ctx.service, generateSecret()),
          recoveryCodes: JSON.stringify([hashOf(code), ...remaining.map(hashOf)]),
        }),
      ]);
      ctx.thenSelectRows([{ name: 'ADMIN' }]);

      await ctx.service.verifyLoginChallenge('c2', code.toLowerCase());

      const persisted = ctx.calls.set?.[0] as Record<string, unknown>;
      expect(JSON.parse(persisted.recoveryCodes as string)).toEqual(remaining.map(hashOf));
      expect(ctx.store.has('2fa:challenge:c2')).toBe(false);
    });

    it('burns the challenge after 5 failed attempts', async () => {
      ctx.store.set('2fa:challenge:c3', {
        userId: USER_ID,
        attempts: 0,
        expiresAt: Date.now() + 60_000,
      });
      ctx.setSelectRows([
        dbUser({
          twoFactorEnabled: true,
          twoFactorSecret: encryptFor(ctx.service, generateSecret()),
          recoveryCodes: null,
        }),
      ]);

      for (let i = 0; i < 5; i++) {
        await expect(ctx.service.verifyLoginChallenge('c3', '000000')).rejects.toMatchObject({
          status: 401,
        });
      }
      expect(ctx.store.has('2fa:challenge:c3')).toBe(false);
      await expect(ctx.service.verifyLoginChallenge('c3', '000000')).rejects.toMatchObject({
        status: 400, // unknown/expired — the challenge is gone
      });
    });
  });
});

/** Encrypt through the service's own private path — keeps the stored-format
 * assertions honest without exposing encryption publicly. */
function encryptFor(service: TwoFactorService, secret: string): string {
  return (service as unknown as { encrypt: (s: string) => string }).encrypt(secret);
}

function hashOf(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}
