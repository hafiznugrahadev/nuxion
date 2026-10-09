import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

const { client, refresh } = vi.hoisted(() => ({ client: vi.fn(), refresh: vi.fn() }));
vi.mock('~/lib/api-client', () => ({ createApiClient: () => client }));
vi.mock('~/lib/xhr-progress', () => ({ xhrProgressStart: vi.fn(), xhrProgressEnd: vi.fn() }));
vi.mock('~/stores/auth', () => ({ useAuthStore: () => ({ accessToken: 'token', refresh }) }));

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiBase: '/api' } }));
});
afterEach(() => vi.unstubAllGlobals());

describe('API unauthorized responses', () => {
  it('preserves a wrong current password field error without refreshing or replaying', async () => {
    const error = {
      response: { status: 401 },
      data: { success: false, fieldErrors: { currentPassword: ['Current password is incorrect'] } },
    };
    client.mockRejectedValueOnce(error);
    await expect(useApi()('/users/me/password', { method: 'PATCH' })).rejects.toBe(error);
    expect(refresh).not.toHaveBeenCalled();
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('refreshes and replays an expired access token response without field attribution', async () => {
    client.mockRejectedValueOnce({ response: { status: 401 }, data: { success: false } });
    client.mockResolvedValueOnce({ success: true, data: { saved: true } });
    refresh.mockResolvedValueOnce(true);
    await expect(useApi()('/users/me/password', { method: 'PATCH' })).resolves.toEqual({
      success: true,
      data: { saved: true },
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(client).toHaveBeenCalledTimes(2);
  });
});
