import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@nuxion/shared-types';
import { clearSession, getAuthState, setSession } from './auth-store';
import { apiFetch, apiFetchPaginated } from './use-api';
import { jsonRes } from './test-render';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => {
  fetchMock.mockReset();
  clearSession();
});

const user: User = {
  id: 'u',
  name: 'User',
  email: 'user@nuxion.test',
  roles: ['USER'],
  createdAt: '',
  updatedAt: '',
  twoFactorEnabled: false,
};

describe('cookie session expiry', () => {
  it('clears an expired session without replaying a mutation', async () => {
    setSession({ user });
    fetchMock.mockResolvedValue(jsonRes(401, { success: false, message: 'expired' }));
    await expect(apiFetch('/users/me', { method: 'PATCH', body: { name: 'New' } })).rejects.toThrow(
      'expired',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthState().user).toBeNull();
  });

  it('preserves the session for a field-attributed wrong password', async () => {
    setSession({ user });
    fetchMock.mockResolvedValue(
      jsonRes(401, {
        success: false,
        message: 'Wrong password',
        fieldErrors: { currentPassword: ['Wrong password'] },
      }),
    );
    await expect(apiFetch('/users/me/password', { method: 'PATCH', body: {} })).rejects.toThrow(
      'Wrong password',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthState().user).toEqual(user);
  });

  it('preserves the session for rejected public auth credentials', async () => {
    setSession({ user });
    fetchMock.mockResolvedValue(jsonRes(401, { success: false, message: 'bad credentials' }));
    await expect(apiFetch('/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthState().user).toEqual(user);
  });

  it('clears expired sessions for paginated requests too', async () => {
    setSession({ user });
    fetchMock.mockResolvedValue(jsonRes(401, { success: false, message: 'expired' }));
    await expect(apiFetchPaginated('/users')).rejects.toThrow('expired');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthState().user).toBeNull();
  });

  it('leaves the session intact for non-auth failures', async () => {
    setSession({ user });
    fetchMock.mockResolvedValue(jsonRes(404, { success: false, message: 'missing' }));
    await expect(apiFetch('/nope')).rejects.toThrow('missing');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAuthState().user).toEqual(user);
  });
});
