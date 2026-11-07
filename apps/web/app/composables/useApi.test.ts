import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

const { client, clear } = vi.hoisted(() => ({ client: vi.fn(), clear: vi.fn() }));
vi.mock('~/lib/api-client', () => ({ createApiClient: () => client }));
vi.mock('~/lib/xhr-progress', () => ({ xhrProgressStart: vi.fn(), xhrProgressEnd: vi.fn() }));
vi.mock('~/stores/auth', () => ({ useAuthStore: () => ({ clear }) }));

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
    expect(clear).not.toHaveBeenCalled();
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('clears an expired session without replaying a mutation', async () => {
    const error = { response: { status: 401 }, data: { success: false } };
    client.mockRejectedValueOnce(error);
    await expect(useApi()('/users/me/password', { method: 'PATCH' })).rejects.toBe(error);
    expect(clear).toHaveBeenCalledTimes(1);
    expect(client).toHaveBeenCalledTimes(1);
  });

  it('preserves the session when public login credentials are rejected', async () => {
    const error = { response: { status: 401 }, data: { success: false } };
    client.mockRejectedValueOnce(error);
    await expect(useApi()('/auth/login', { method: 'POST' })).rejects.toBe(error);
    expect(clear).not.toHaveBeenCalled();
    expect(client).toHaveBeenCalledTimes(1);
  });
});
