import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession, getAuthState, setSession } from '@/lib/auth-store';
import { securityApi } from './api';
import { apiFetch } from '@/lib/use-api';

vi.mock('@/lib/use-api', () => ({ apiFetch: vi.fn() }));
afterEach(() => {
  clearSession();
  vi.mocked(apiFetch).mockReset();
});

describe('two-factor activation session upgrade', () => {
  it('replaces the pending token with the session returned by activation', async () => {
    setSession({ accessToken: 'pending', user: { id: 'A' } as never, enrollmentRequired: true });
    const result = {
      accessToken: 'full',
      user: { id: 'A', twoFactorEnabled: true },
      enrollmentRequired: false,
      recoveryCodes: ['dummy-code'],
    };
    vi.mocked(apiFetch).mockResolvedValue(result);
    await expect(securityApi.twoFactorActivate('123456')).resolves.toEqual(result);
    expect(getAuthState().accessToken).toBe('full');
    expect(getAuthState().enrollmentRequired).toBe(false);
  });
  it('does not restore an activation response after logout', async () => {
    setSession({ accessToken: 'pending', user: { id: 'A' } as never, enrollmentRequired: true });
    let complete!: (value: unknown) => void;
    vi.mocked(apiFetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    const pending = securityApi.twoFactorActivate('123456');
    const rejection = expect(pending).rejects.toThrow('Session changed');
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledOnce());
    clearSession();
    complete({
      accessToken: 'full',
      user: { id: 'A' },
      enrollmentRequired: false,
      recoveryCodes: ['dummy'],
    });
    await rejection;
    expect(getAuthState().user).toBeNull();
  });
});
