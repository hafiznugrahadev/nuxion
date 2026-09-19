import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '@infrastructure/database/prisma.service';
import type { RedisService } from '@infrastructure/redis/redis.service';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';
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

/** Prisma user row as verifyLogin returns it (secrets omitted, roles included). */
const dbUser = {
  id: USER_ID,
  email: 'admin@nuxion.test',
  name: 'Admin',
  avatarUrl: null,
  twoFactorEnabled: true,
  roles: [{ name: 'ADMIN' }],
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
  user: dbUser,
};

function makeService(passkeyEnabled = true) {
  const prisma = {
    user: { findUnique: vi.fn(async () => dbUser) },
    passkey: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => storedPasskey),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        ...storedPasskey,
        ...data,
      })),
      update: vi.fn(async () => storedPasskey),
      delete: vi.fn(async () => storedPasskey),
    },
  };
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
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
    config as unknown as ConfigService,
  );
  return { service, prisma, store };
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
      const { service, store } = makeService();
      const options = await service.registrationOptions(USER_ID);
      expect(options.challenge).toBe('reg-challenge');
      expect(store.get(`webauthn:reg:${USER_ID}`)).toBe('reg-challenge');
    });
  });

  describe('verifyRegistration', () => {
    it('stores the credential and clears the challenge', async () => {
      const { service, prisma, store } = makeService(true);
      store.set(`webauthn:reg:${USER_ID}`, 'reg-challenge');

      const passkey = await service.verifyRegistration(
        USER_ID,
        {} as RegistrationResponseJSON,
        'My key',
      );

      expect(passkey.id).toBe('cred-id-1');
      const data = (prisma.passkey.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(data.userId).toBe(USER_ID);
      expect(data.publicKey).toBe('b64(1,2,3)'); // encoded, not the raw buffer
      expect(data.counter).toBe(0n);
      expect(data.transports).toEqual(['internal']);
      expect(data.backedUp).toBe(true);
      expect(store.has(`webauthn:reg:${USER_ID}`)).toBe(false);
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
      const { service, prisma, store } = makeService();
      store.set('webauthn:auth:c9', 'auth-challenge');

      const result = await service.verifyLogin('c9', {
        id: 'cred-id-1',
      } as AuthenticationResponseJSON);

      expect(result.user.id).toBe(USER_ID);
      expect(result.userVerified).toBe(true);
      const data = (prisma.passkey.update as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
      expect(data.counter).toBe(7n);
      expect(data.lastUsedAt).toBeInstanceOf(Date);
      expect(store.has('webauthn:auth:c9')).toBe(false);
    });

    it('rejects an assertion for an unknown credential', async () => {
      const { service, prisma, store } = makeService();
      store.set('webauthn:auth:c9', 'auth-challenge');
      (prisma.passkey.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.verifyLogin('c9', { id: 'ghost' } as AuthenticationResponseJSON),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('removePasskey', () => {
    it('deletes an own passkey', async () => {
      const { service, prisma } = makeService();
      await service.removePasskey(USER_ID, 'cred-id-1');
      expect(prisma.passkey.delete).toHaveBeenCalledWith({ where: { id: 'cred-id-1' } });
    });

    it("reports 404 for someone else's passkey (no existence leak)", async () => {
      const { service } = makeService();
      await expect(service.removePasskey('someone-else', 'cred-id-1')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
