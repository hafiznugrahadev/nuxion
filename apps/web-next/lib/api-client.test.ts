import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-errors';
import { createApiClient, unwrap, unwrapPaginated } from './api-client';
import { jsonRes } from './test-render';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

describe('createApiClient', () => {
  it('repeats array query values as separate keys', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(jsonRes(200, { success: true, data: [] })));
    const client = createApiClient({ baseURL: '/api' });
    await client('/users', { query: { roles: ['ADMIN', 'EDITOR'], page: 2 } });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('roles=ADMIN');
    expect(url).toContain('roles=EDITOR');
    expect(url).toContain('page=2');
  });

  it('drops undefined and null query values', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonRes(200, { success: true, data: null })),
    );
    const client = createApiClient({ baseURL: '/api' });
    await client('/x', { query: { search: undefined, flag: null, keep: 1 } });
    const url = fetchMock.mock.calls[0]![0] as string;
    expect(url).toContain('keep=1');
    expect(url).not.toContain('search');
    expect(url).not.toContain('flag');
  });

  it('attaches the Bearer token from getToken', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonRes(200, { success: true, data: null })),
    );
    const client = createApiClient({ baseURL: '/api', getToken: () => 'tok-123' });
    await client('/me');
    const init = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer tok-123');
  });

  it('JSON-encodes plain bodies but passes FormData through untouched', async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonRes(200, { success: true, data: null })),
    );
    const client = createApiClient({ baseURL: '/api' });

    await client('/a', { method: 'POST', body: { x: 1 } });
    const jsonInit = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(jsonInit.body).toBe('{"x":1}');
    expect(new Headers(jsonInit.headers).get('content-type')).toBe('application/json');

    const form = new FormData();
    form.append('file', new Blob(['x']), 'f.png');
    await client('/files', { method: 'POST', body: form });
    const formInit = fetchMock.mock.calls[1]![1] as RequestInit;
    expect(formInit.body).toBe(form);
    expect(new Headers(formInit.headers).get('content-type')).toBeNull();
  });

  it('throws ApiError carrying the envelope and status on failure', async () => {
    fetchMock.mockResolvedValue(
      jsonRes(409, { success: false, message: 'taken', fieldErrors: { email: ['taken'] } }),
    );
    const client = createApiClient({ baseURL: '/api' });
    const err = await client('/users', { method: 'POST', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError & { status?: number }).status).toBe(409);
    expect(err.data.fieldErrors).toEqual({ email: ['taken'] });
  });

  it('signals start/end around the call, also on failure', async () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(jsonRes(200, { success: true, data: null })))
      .mockImplementationOnce(() =>
        Promise.resolve(jsonRes(500, { success: false, message: 'boom' })),
      );
    const client = createApiClient({ baseURL: '/api', onStart, onEnd });
    await client('/ok');
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    await client('/bad').catch(() => undefined);
    expect(onStart).toHaveBeenCalledTimes(2);
    expect(onEnd).toHaveBeenCalledTimes(2);
  });
});

describe('unwrap', () => {
  it('returns the data of a success envelope', () => {
    expect(unwrap({ success: true, data: 42 })).toBe(42);
  });

  it('throws ApiError on the error shape', () => {
    expect(() => unwrap({ success: false, message: 'no' } as never)).toThrow(ApiError);
  });
});

describe('unwrapPaginated', () => {
  it('splits a paginated envelope into data + meta', () => {
    const out = unwrapPaginated({ success: true, data: [1, 2], meta: { page: 1 } } as never);
    expect(out.data).toEqual([1, 2]);
    expect(out.meta).toEqual({ page: 1 });
  });
});
