import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { RedisService } from '@infrastructure/redis/redis.service';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
import { mockDb } from '../../../../test/helpers/mock-db';
import { WebAuthnService } from '../webauthn.service';

vi.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: vi.fn(async () => ({
    challenge: 'reg-challenge',
    rp: { id: 'nuxion-dev.orb.local', name: 'Nuxion' },
    user: { id: 'dXNlcg', name: 'admin@nuxion.test', displayName: 'Admin' },
    pubKeyCredParams: [],
    timeout: 60_000,
    excludeCredentials: [],
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    attestation: 'none',
  })),
  generateAuthenticationOptions: vi.fn(async () => ({
    challenge: 'auth-challenge',
    rpId: 'nuxion-dev.orb.local',
    timeout: 60_000,
    allowCredentials: [],
    userVerification: 'preferred',
  })),
  verifyRegistrationResponse: vi.fn(async () => ({
    verified: true,
    registrationInfo: {
      fmt: 'none',
      aaguid: '',
      credential: {
        id: 'cred-id-1',
        publicKey: new Uint8Array([1, 2, 3]),
        counter: 0,
        transports: ['internal'],
      },
      credentialType: 'public-key',
      attestationObject: new Uint8Array(),
      userVerified: true,
      credentialDeviceType: 'multiDevice',
      credentialBackedUp: true,
      origin: 'https://web.nuxion-dev.orb.local',
    },
  })),
  verifyAuthenticationResponse: vi.fn(async () => ({
    verified: true,
    authenticationInfo: {
      credentialID: 'cred-id-1',
      newCounter: 7,
      userVerified: true,
      credentialDeviceType: 'multiDevice',
      credentialBackedUp: true,
      origin: 'https://web.nuxion-dev.orb.local',
      rpID: 'nuxion-dev.orb.local',
    },
  })),
}));

vi.mock('@simplewebauthn/server/helpers', () => ({
  isoBase64URL: {
    fromBuffer: vi.fn((buf: Uint8Array) => `b64(${Array.from(buf).join(',')})`),
    toBuffer: vi.fn(() => new Uint8Array([1, 2, 3])),
  },
}));

const USER_ID = 'user-1';

/** User row as registrationOptions reads it. */
const dbUser = { id: USER_ID, email: 'admin@nuxion.test', name: 'Admin' };

/** Session-shaped user row verifyLogin reads after verification. */
const sessionUser = {
  id: USER_ID,
  email: 'admin@nuxion.test',
  name: 'Admin',
  avatarUrl: null,
  twoFactorEnabled: true,
};

const storedPasskey = {
  id: 'cred-id-1',
  userId: USER_ID,
  publicKey: 'cHVia2V5',
  counter: 0n,
  transports: ['internal'],
  deviceType: 'multiDevice',
  backedUp: true,
  name: 'MacBook',
  lastUsedAt: null,
  createdAt: new Date(),
};

function makeService(passkeyEnabled = true) {
  const mock = mockDb({ insert: [storedPasskey] });
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
    get: vi.fn((key: string) => (key === 'app.passkey.enabled' ? passkeyEnabled : undefined)),
    getOrThrow: vi.fn((key: string) => {
      if (key === 'app.webauthn.rpName') return 'Nuxion';
      if (key === 'app.webauthn.rpId') return 'nuxion-dev.orb.local';
      if (key === 'app.webauthn.origins') return ['https://web.nuxion-dev.orb.local'];
      throw new Error(`unexpected getOrThrow: ${key}`);
    }),
  };
  const service = new WebAuthnService(
    mock.db,
    redis as unknown as RedisService,
    config as unknown as ConfigService,
  );
  return { ...mock, service, store };
}

describe('WebAuthnService', () => {
  describe('when the passkey flag is off', () => {
    it('refuses every operation', async () => {
      const { service } = makeService(false);
      await expect(service.loginOptions()).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('registrationOptions', () => {
    it('returns options and parks the challenge in Redis', async () => {
      const ctx = makeService();
      ctx.setSelectRows([dbUser]);
      ctx.thenSelectRows([]); // existing passkeys
      const options = await ctx.service.registrationOptions(USER_ID);
      expect(options.challenge).toBe('reg-challenge');
      expect(ctx.store.get(`webauthn:reg:${USER_ID}`)).toBe('reg-challenge');
    });
  });

  describe('verifyRegistration', () => {
    it('stores the credential and clears the challenge', async () => {
      const ctx = makeService();
      ctx.store.set(`webauthn:reg:${USER_ID}`, 'reg-challenge');

      const passkey = await ctx.service.verifyRegistration(
        USER_ID,
        {} as RegistrationResponseJSON,
        'My key',
      );

      expect(passkey.id).toBe('cred-id-1');
      const data = ctx.calls.values?.[0] as Record<string, unknown>;
      expect(data.userId).toBe(USER_ID);
      expect(data.publicKey).toBe('b64(1,2,3)'); // encoded, not the raw buffer
      expect(data.counter).toBe(0n);
      expect(data.transports).toEqual(['internal']);
      expect(data.backedUp).toBe(true);
      expect(ctx.store.has(`webauthn:reg:${USER_ID}`)).toBe(false);
    });

    it('rejects a stale registration (challenge expired)', async () => {
      const { service } = makeService();
      await expect(
        service.verifyRegistration(USER_ID, {} as RegistrationResponseJSON),
      ).rejects.toMatchObject({ status: 400 });
    });
  });

  describe('loginOptions + verifyLogin', () => {
    it('keys the challenge by an opaque id (usernameless)', async () => {
      const { service, store } = makeService();
      const { challengeId, options } = await service.loginOptions();
      expect(options.rpId).toBe('nuxion-dev.orb.local');
      expect(store.get(`webauthn:auth:${challengeId}`)).toBe('auth-challenge');
      expect(challengeId).not.toBe(USER_ID);
    });

    it('returns the user and UV flag, updating counter + lastUsedAt', async () => {
      const ctx = makeService();
      ctx.store.set('webauthn:auth:c9', 'auth-challenge');
      ctx.setSelectRows([storedPasskey]);
      ctx.thenSelectRows([sessionUser]);
      ctx.thenSelectRows([{ name: 'ADMIN' }]);

      const result = await ctx.service.verifyLogin('c9', {
        id: 'cred-id-1',
      } as AuthenticationResponseJSON);

      expect(result.user.id).toBe(USER_ID);
      expect(result.user.roles).toEqual([{ name: 'ADMIN' }]);
      expect(result.userVerified).toBe(true);
      const data = ctx.calls.set?.[0] as Record<string, unknown>;
      expect(data.counter).toBe(7n);
      expect(data.lastUsedAt).toBeInstanceOf(Date);
      expect(ctx.store.has('webauthn:auth:c9')).toBe(false);
    });

    it('rejects an assertion for an unknown credential', async () => {
      const ctx = makeService();
      ctx.store.set('webauthn:auth:c9', 'auth-challenge');
      ctx.setSelectRows([]);

      await expect(
        ctx.service.verifyLogin('c9', { id: 'ghost' } as AuthenticationResponseJSON),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('removePasskey', () => {
    it('deletes an own passkey', async () => {
      const ctx = makeService();
      ctx.setSelectRows([storedPasskey]);
      await ctx.service.removePasskey(USER_ID, 'cred-id-1');
      expect(ctx.db.delete).toHaveBeenCalled();
    });

    it("reports 404 for someone else's passkey (no existence leak)", async () => {
      const ctx = makeService();
      ctx.setSelectRows([storedPasskey]);
      await expect(ctx.service.removePasskey('someone-else', 'cred-id-1')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
