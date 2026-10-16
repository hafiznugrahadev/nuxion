import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '~/stores/auth';

const navigate = vi.fn();
beforeEach(() => {
  setActivePinia(createPinia());
  navigate.mockReset();
  vi.stubGlobal('defineNuxtRouteMiddleware', (guard: unknown) => guard);
  vi.stubGlobal('navigateTo', navigate);
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { twoFactorEnabled: false } }));
});
afterEach(() => vi.unstubAllGlobals());

async function visit(path: string) {
  const guard = (await import('./auth')).default;
  return guard({ path, fullPath: path } as never, {} as never);
}

describe('server-required enrollment', () => {
  it('redirects to enrollment even when the public feature flag is false', async () => {
    useAuthStore().setSession({
      accessToken: 'pending',
      user: { id: 'A' } as never,
      enrollmentRequired: true,
    });
    await visit('/admin/profile');
    expect(navigate).toHaveBeenCalledWith({
      path: '/two-factor/setup',
      query: { redirect: '/admin/profile' },
    });
  });
  it('allows the setup page while enrollment is pending', async () => {
    useAuthStore().setSession({
      accessToken: 'pending',
      user: { id: 'A' } as never,
      enrollmentRequired: true,
    });
    await visit('/two-factor/setup');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('allows a user-verified passkey session without registered TOTP', async () => {
    useAuthStore().setSession({
      accessToken: 'full',
      user: { id: 'A', twoFactorEnabled: false } as never,
      enrollmentRequired: false,
    });
    await visit('/admin/profile');
    expect(navigate).not.toHaveBeenCalled();
  });
});
