import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession, setSession } from './auth-store';
import { apiFetch } from './use-api';
import { jsonRes } from './test-render';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => {
  fetchMock.mockReset();
  clearSession();
});

const SESSION = {
  success: true,
  data: {
    accessToken: 'fresh-token',
    user: { id: 'u', name: 'U', roles: ['USER'], createdAt: '' },
  },
};

describe('apiFetch 401 → refresh → retry', () => {
  it('replays a data route once after a successful refresh', async () => {
    setSession(SESSION.data as never);
    fetchMock
      .mockResolvedValueOnce(jsonRes(401, { success: false, message: 'expired' })) // original
      .mockResolvedValueOnce(jsonRes(200, SESSION)) // /auth/refresh
      .mockResolvedValueOnce(jsonRes(200, { success: true, data: 'payload' })); // replay
    await expect(apiFetch<string>('/users/me')).resolves.toBe('payload');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // The replay carries the NEW token from the refreshed session.
    const replayInit = fetchMock.mock.calls[2]![1] as RequestInit;
    expect(new Headers(replayInit.headers).get('Authorization')).toBe('Bearer fresh-token');
  });

  it('does not replay a mutation when refresh changes the active identity', async () => {
    setSession({ accessToken: 'A', user: { id: 'A' } as never });
    fetchMock
      .mockResolvedValueOnce(jsonRes(401, { success: false, message: 'expired' }))
      .mockResolvedValueOnce(jsonRes(200, SESSION));
    await expect(
      apiFetch('/users/me', { method: 'PATCH', body: { name: 'A edit' } }),
    ).rejects.toThrow('Session changed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/users/me')).toHaveLength(1);
  });

  it('releases the activation queue before refreshing an expired pending token', async () => {
    const pending = { ...SESSION.data, enrollmentRequired: true };
    setSession(pending as never);
    fetchMock
      .mockResolvedValueOnce(jsonRes(401, { success: false, message: 'expired' }))
      .mockResolvedValueOnce(jsonRes(200, { success: true, data: pending }))
      .mockResolvedValueOnce(jsonRes(200, { success: true, data: { recoveryCodes: ['dummy'] } }));
    await expect(
      apiFetch('/auth/2fa/activate', { method: 'POST', body: { code: '123456' } }),
    ).resolves.toEqual({ recoveryCodes: ['dummy'] });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/auth/2fa/activate',
      '/api/auth/refresh',
      '/api/auth/2fa/activate',
    ]);
  });

  it('does not retry the token-minting auth routes', async () => {
    fetchMock.mockResolvedValue(jsonRes(401, { success: false, message: 'bad credentials' }));
    await expect(apiFetch('/auth/login', { method: 'POST', body: {} })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('propagates the original error when the refresh also fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonRes(401, { success: false, message: 'expired' }))
      .mockResolvedValueOnce(jsonRes(401, { success: false, message: 'no cookie' }));
    await expect(apiFetch('/users/me')).rejects.toThrow('expired');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('non-401 failures pass straight through without a refresh', async () => {
    fetchMock.mockResolvedValue(jsonRes(404, { success: false, message: 'missing' }));
    await expect(apiFetch('/nope')).rejects.toThrow('missing');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
