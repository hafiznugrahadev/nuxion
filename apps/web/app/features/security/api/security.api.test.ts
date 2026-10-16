import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAuthStore } from '~/stores/auth';
import { useSecurityApi } from './security.api';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('~/composables/useApi', () => ({ useApi: () => api }));
beforeEach(() => setActivePinia(createPinia()));
afterEach(() => api.mockReset());

describe('two-factor activation session upgrade', () => {
  it('replaces the pending token with the session returned by activation', async () => {
    const auth = useAuthStore();
    auth.setSession({
      accessToken: 'pending',
      user: { id: 'A' } as never,
      enrollmentRequired: true,
    });
    const result = {
      accessToken: 'full',
      user: { id: 'A', twoFactorEnabled: true },
      enrollmentRequired: false,
      recoveryCodes: ['dummy-code'],
    };
    api.mockResolvedValue({ success: true, data: result });
    await expect(useSecurityApi().twoFactorActivate('123456')).resolves.toEqual(result);
    expect(auth.accessToken).toBe('full');
    expect(auth.enrollmentRequired).toBe(false);
  });
  it('does not restore an activation response after logout', async () => {
    const auth = useAuthStore();
    auth.setSession({
      accessToken: 'pending',
      user: { id: 'A' } as never,
      enrollmentRequired: true,
    });
    let complete!: (value: unknown) => void;
    api.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = useSecurityApi().twoFactorActivate('123456');
    const rejection = expect(pending).rejects.toThrow('Session changed');
    await vi.waitFor(() => expect(api).toHaveBeenCalledOnce());
    auth.clear();
    complete({
      success: true,
      data: {
        accessToken: 'full',
        user: { id: 'A' },
        enrollmentRequired: false,
        recoveryCodes: ['dummy'],
      },
    });
    await rejection;
    expect(auth.user).toBeNull();
  });
});
