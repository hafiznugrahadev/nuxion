import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { UserRole, type User } from '@nuxion/shared-types';
import { useAuthStore } from './auth';

/**
 * Covers the state layer: session lifecycle and role getters. The network
 * actions (login / refresh / …) need the Nuxt runtime ($fetch,
 * useRuntimeConfig) and are exercised end-to-end by the Playwright suite.
 */

function user(roles: string[]): User {
  return {
    id: 'u1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    email: 'demo@nuxion.test',
    name: 'Demo User',
    roles,
    twoFactorEnabled: false,
  };
}

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts logged out', () => {
    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.isAdmin).toBe(false);
    expect(auth.isSuperAdmin).toBe(false);
  });

  it('setSession stores the in-memory token and user', () => {
    const auth = useAuthStore();
    auth.setSession({ accessToken: 'jwt', user: user([UserRole.USER]) });
    expect(auth.isAuthenticated).toBe(true);
    expect(auth.user?.email).toBe('demo@nuxion.test');
  });

  it('role getters reflect the held roles, not just authentication', () => {
    const auth = useAuthStore();

    auth.setSession({ accessToken: 'jwt', user: user([UserRole.ADMIN]) });
    expect(auth.isAdmin).toBe(true);
    expect(auth.isSuperAdmin).toBe(false);

    auth.setSession({ accessToken: 'jwt', user: user([UserRole.SUPER_ADMIN]) });
    expect(auth.isSuperAdmin).toBe(true);

    auth.setSession({ accessToken: 'jwt', user: user([UserRole.USER]) });
    expect(auth.isAdmin).toBe(false);
  });

  it('clear() wipes the session (logout / failed refresh)', () => {
    const auth = useAuthStore();
    auth.setSession({ accessToken: 'jwt', user: user([UserRole.ADMIN]) });
    auth.clear();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.user).toBeNull();
    expect(auth.isAdmin).toBe(false);
  });

  it('uses the server enrollment decision even when TOTP is not registered', () => {
    const auth = useAuthStore();
    auth.setSession({ accessToken: 'pending', user: user(['USER']), enrollmentRequired: true });
    expect(auth.enrollmentRequired).toBe(true);
    const generation = auth.sessionGeneration;
    auth.setSession({ accessToken: 'uv-passkey', user: user(['USER']), enrollmentRequired: false });
    expect(auth.enrollmentRequired).toBe(false);
    expect(auth.sessionGeneration).toBeGreaterThan(generation);
  });
});

describe('auth request identity races', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '/api' } }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('dispatches login B only after refresh A has consumed its response cookie', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('$fetch', fetch);
    const auth = useAuthStore();
    auth.setSession({ accessToken: 'A', user: user(['USER']) });
    let respond!: (value: unknown) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    const refreshA = auth.refresh();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    fetch.mockResolvedValueOnce({
      success: true,
      data: { accessToken: 'B', user: { ...user(['USER']), id: 'B' } },
    });
    const loginB = auth.login('b@nuxion.test', 'dummy-password');
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledOnce();
    respond({ success: true, data: { accessToken: 'A', user: user(['USER']) } });
    await expect(refreshA).resolves.toBe(false);
    await loginB;
    expect(fetch.mock.calls.map(([url]) => url)).toEqual(['/auth/refresh', '/auth/login']);
    expect(auth.user?.id).toBe('B');
  });

  it('waits for a late login cookie before logout without restoring its state', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('$fetch', fetch);
    let respond!: (value: unknown) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    const auth = useAuthStore();
    const pending = auth.login('dummy@nuxion.test', 'dummy-password');
    const rejected = expect(pending).rejects.toThrow('Session changed');
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    fetch.mockResolvedValueOnce({ success: true, data: {} });
    const logout = auth.logout();
    await expect(auth.refresh()).resolves.toBe(false);
    expect(fetch).toHaveBeenCalledOnce();
    respond({ success: true, data: { accessToken: 'A', user: user(['USER']) } });
    await rejected;
    await logout;
    expect(fetch.mock.calls[1]![0]).toBe('/auth/logout');
    expect(auth.user).toBeNull();
  });

  it('shares concurrent refresh and ignores its old response after an identity change', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('$fetch', fetch);
    let respond!: (value: unknown) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          respond = resolve;
        }),
    );
    const auth = useAuthStore();
    const first = auth.refresh();
    const second = auth.refresh();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    auth.setSession({ accessToken: 'B', user: { ...user(['USER']), id: 'B' } });
    respond({ success: true, data: { accessToken: 'A', user: user(['USER']) } });
    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    expect(auth.user?.id).toBe('B');
  });
});
