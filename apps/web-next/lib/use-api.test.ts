import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearSession } from './auth-store';
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
