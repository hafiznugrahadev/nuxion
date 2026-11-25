import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { User } from '@nuxion/shared-types';
import { useAuthStore } from './auth';

const fetchMock = vi.fn();
const user: User = {
  id: 'u1',
  name: 'Demo',
  email: 'demo@nuxion.test',
  roles: ['USER'],
  createdAt: '',
  updatedAt: '',
  twoFactorEnabled: false,
};
const session = { success: true, data: { user } };

beforeEach(() => {
  setActivePinia(createPinia());
  vi.stubGlobal('$fetch', fetchMock);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '/api' } }));
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe('auth cookie requests', () => {
  it('logs in with cookie credentials and stores only the user', async () => {
    fetchMock.mockResolvedValue(session);
    const auth = useAuthStore();
    await auth.login(user.email, 'password');
    expect(fetchMock).toHaveBeenCalledWith('/auth/login', {
      baseURL: '/api',
      credentials: 'include',
      method: 'POST',
      body: { email: user.email, password: 'password' },
    });
    expect(auth.$state).toEqual({ user });
  });

  it('keeps a TOTP challenge unauthenticated until verification succeeds', async () => {
    const challenge = { twoFactorRequired: true, challengeId: 'challenge' };
    fetchMock.mockResolvedValueOnce({ success: true, data: challenge });
    const auth = useAuthStore();
    await expect(auth.login(user.email, 'password')).resolves.toEqual(challenge);
    expect(auth.isAuthenticated).toBe(false);
    fetchMock.mockResolvedValueOnce(session);
    await auth.verifyTwoFactor('challenge', '123456');
    expect(auth.isAuthenticated).toBe(true);
    expect(fetchMock).toHaveBeenLastCalledWith('/auth/2fa/verify', {
      baseURL: '/api',
      credentials: 'include',
      method: 'POST',
      body: { challengeId: 'challenge', code: '123456' },
    });
  });

  it('sets the user after registration', async () => {
    fetchMock.mockResolvedValue(session);
    const auth = useAuthStore();
    await auth.register(user.name, user.email, 'password');
    expect(auth.user).toEqual(user);
  });

  it('restores once for concurrent callers with a non-cacheable GET', async () => {
    fetchMock.mockResolvedValue(session);
    const auth = useAuthStore();
    await expect(Promise.all([auth.restoreSession(), auth.restoreSession()])).resolves.toEqual([
      true,
      true,
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/auth/session', {
      baseURL: '/api',
      credentials: 'include',
      method: 'GET',
      cache: 'no-store',
      retry: 0,
    });
    expect(auth.user).toEqual(user);
  });

  it('clears stale state when restoration fails', async () => {
    const auth = useAuthStore();
    auth.setSession({ user });
    fetchMock.mockRejectedValue(new Error('expired'));
    await expect(auth.restoreSession()).resolves.toBe(false);
    expect(auth.user).toBeNull();
  });

  it('clears local state even if logout fails', async () => {
    const auth = useAuthStore();
    auth.setSession({ user });
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(auth.logout()).resolves.toBeUndefined();
    expect(auth.user).toBeNull();
  });

  it('keeps a passkey MFA challenge unauthenticated', async () => {
    const challenge = { twoFactorRequired: true, challengeId: 'challenge' };
    fetchMock.mockResolvedValue({ success: true, data: challenge });
    const auth = useAuthStore();
    await expect(auth.passkeyLoginVerify('passkey', {})).resolves.toEqual(challenge);
    expect(auth.user).toBeNull();
  });

  it('sets the user after a verified passkey', async () => {
    fetchMock.mockResolvedValue(session);
    const auth = useAuthStore();
    await auth.passkeyLoginVerify('passkey', {});
    expect(auth.user).toEqual(user);
  });
});
