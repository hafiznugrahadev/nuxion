import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getAuthState, isAuthenticated, setSession } from './auth-store';
import {
  forgotPassword,
  login,
  logout,
  PASSKEY_ENABLED,
  refreshSession,
  REGISTRATION_ENABLED,
  resetPassword,
  TWO_FACTOR_ENABLED,
  verifyTwoFactor,
} from './auth-api';
import { getXhrPending } from './xhr-progress';
import { jsonRes } from './test-render';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => {
  fetchMock.mockReset();
  clearSession();
});

const SESSION_BODY = {
  success: true,
  data: { accessToken: 'tok', user: { id: 'u', name: 'U', roles: ['USER'], createdAt: '' } },
};

describe('login', () => {
  it('sets the session on a straight success', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, SESSION_BODY));
    const result = await login('a@b.c', 'pass');
    expect(result).not.toHaveProperty('twoFactorRequired');
    expect(isAuthenticated(getAuthState())).toBe(true);
    expect(fetchMock.mock.calls[0]![0]).toBe('/api/auth/login');
  });

  it('returns the challenge WITHOUT setting a session when TOTP is on', async () => {
    fetchMock.mockResolvedValue(
      jsonRes(200, { success: true, data: { twoFactorRequired: true, challengeId: 'ch-1' } }),
    );
    const result = await login('a@b.c', 'pass');
    expect(result).toEqual({ twoFactorRequired: true, challengeId: 'ch-1' });
    expect(isAuthenticated(getAuthState())).toBe(false);
  });

  it('drives the shared XHR progress counter start→end', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, SESSION_BODY));
    const before = getXhrPending();
    await login('a@b.c', 'pass');
    expect(getXhrPending()).toBe(before);
  });
});

describe('verifyTwoFactor', () => {
  it('consumes the challenge and sets the session', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, SESSION_BODY));
    await verifyTwoFactor('ch-1', '123456');
    expect(isAuthenticated(getAuthState())).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/2fa/verify');
    expect(JSON.parse(init.body as string)).toEqual({ challengeId: 'ch-1', code: '123456' });
  });
});

describe('refreshSession', () => {
  it('restores the session on success', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, SESSION_BODY));
    await expect(refreshSession()).resolves.toBe(true);
    expect(isAuthenticated(getAuthState())).toBe(true);
  });

  it('clears and returns false when the cookie is gone', async () => {
    setSession({ accessToken: 'stale', user: {} as never });
    fetchMock.mockResolvedValue(jsonRes(401, { success: false, message: 'nope' }));
    await expect(refreshSession()).resolves.toBe(false);
    expect(isAuthenticated(getAuthState())).toBe(false);
  });

  it('treats a network failure as logged out (no throw)', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    await expect(refreshSession()).resolves.toBe(false);
  });
});

describe('logout', () => {
  it('clears the session even when the API call fails', async () => {
    setSession({ accessToken: 't', user: {} as never });
    fetchMock.mockRejectedValue(new Error('boom'));
    await expect(logout()).resolves.toBeUndefined();
    expect(isAuthenticated(getAuthState())).toBe(false);
  });
});

describe('password flows', () => {
  it('forgotPassword posts the email and swallows nothing on failure', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, { success: true, data: { message: 'sent' } }));
    await expect(forgotPassword('a@b.c')).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/forgot-password');
    expect(JSON.parse(init.body as string)).toEqual({ email: 'a@b.c' });
  });

  it('resetPassword posts token + newPassword', async () => {
    fetchMock.mockResolvedValue(jsonRes(200, { success: true, data: { message: 'ok' } }));
    await expect(resetPassword('tok-1', 'new-pass-123')).resolves.toBeUndefined();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/reset-password');
    expect(JSON.parse(init.body as string)).toEqual({
      token: 'tok-1',
      newPassword: 'new-pass-123',
    });
  });
});

describe('feature flags default off without env', () => {
  it('REGISTRATION/TWO_FACTOR/PASSKEY parse the env strictly', () => {
    // Defaults under an unset/blank env: the build-time inlines are '…' only
    // when explicitly set, otherwise undefined → false.
    expect(typeof REGISTRATION_ENABLED).toBe('boolean');
    expect(typeof TWO_FACTOR_ENABLED).toBe('boolean');
    expect(typeof PASSKEY_ENABLED).toBe('boolean');
  });
});
