// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { proxyToApi } from './proxy';
import { MAX_PROXY_BYTES, PROXY_TIMEOUT_MS } from './proxy-body';

function request(chunks: Uint8Array[], headers: Record<string, string> = {}): Request {
  return {
    url: 'https://web.invalid/api/files?folder=avatars',
    method: 'POST',
    headers: new Headers(headers),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
  } as Request;
}

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_API_INTERNAL_BASE', 'http://localhost:8000');
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function response(body: string, status = 200) {
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', 'first=1; HttpOnly');
  headers.append('set-cookie', 'second=2; HttpOnly');
  return new Response(body, { status, headers });
}

describe('API proxy request boundaries', () => {
  it('rejects oversized declared bodies without contacting the API', async () => {
    const result = await proxyToApi(
      request([], { 'content-length': String(MAX_PROXY_BYTES + 1) }),
      '/api',
    );
    expect(result.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('rejects chunked bodies that exceed the limit before API authentication', async () => {
    const result = await proxyToApi(
      request([new Uint8Array(MAX_PROXY_BYTES), new Uint8Array(1)]),
      '/api',
    );
    expect(result.status).toBe(413);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('preserves multipart bytes, query strings and separate cookies', async () => {
    fetchMock.mockResolvedValue(response('ok'));
    const bytes = new TextEncoder().encode('--boundary\r\nexample\r\n--boundary--');
    const result = await proxyToApi(
      request([bytes], { 'content-type': 'multipart/form-data; boundary=boundary' }),
      '/api',
    );
    expect(result.status).toBe(200);
    const [target, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(target).toBe('http://localhost:8000/api/files?folder=avatars');
    expect(new Headers(init.headers).get('content-type')).toContain('boundary=boundary');
    expect([...(init.body as Uint8Array)]).toEqual([...bytes]);
    expect(result.headers.getSetCookie()).toHaveLength(2);
    expect(await result.text()).toBe('ok');
  });
  it('maps oversized upstream responses to 502', async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { headers: { 'content-length': String(MAX_PROXY_BYTES + 1) } }),
    );
    const result = await proxyToApi(request([]), '/api');
    expect(result.status).toBe(502);
  });
  it('aborts stalled upstream calls at the deadline', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_target: string, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal!.addEventListener('abort', () => reject(options.signal!.reason), {
            once: true,
          });
        }),
    );
    const pending = proxyToApi(request([]), '/api');
    await vi.advanceTimersByTimeAsync(PROXY_TIMEOUT_MS);
    expect((await pending).status).toBe(504);
  });
  it('returns bodyless upstream statuses without a constructor failure', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const result = await proxyToApi(request([]), '/api');
    expect(result.status).toBe(204);
    expect(await result.text()).toBe('');
  });
});
