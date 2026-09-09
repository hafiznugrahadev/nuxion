import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildWebhookPayload,
  createMattermostStream,
  formatMattermostMessage,
  isHttpAccessLog,
  lowestLogLevel,
} from './mattermost.transport';

const baseOptions = {
  webhookUrl: 'http://mattermost.test/hooks/abc123',
  username: 'Nuxion API',
};

/** Write a line and wait until the stream accepted it (enqueue done). */
function writeAsync(
  stream: ReturnType<typeof createMattermostStream>,
  line: string,
): Promise<void> {
  return new Promise((resolve) => stream.write(line, () => resolve()));
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe('lowestLogLevel', () => {
  it('picks the most verbose level', () => {
    expect(lowestLogLevel('info', 'error')).toBe('info');
    expect(lowestLogLevel('error', 'warn')).toBe('warn');
    expect(lowestLogLevel('fatal', 'fatal')).toBe('fatal');
  });
});

describe('isHttpAccessLog', () => {
  it('detects pino-http access logs', () => {
    const record = { level: 30, req: { method: 'GET' }, res: { statusCode: 200 }, responseTime: 3 };
    expect(isHttpAccessLog(record)).toBe(true);
  });

  it('does not flag ordinary app logs', () => {
    expect(isHttpAccessLog({ level: 50, context: 'AuthService' })).toBe(false);
  });
});

describe('formatMattermostMessage', () => {
  it('renders level emoji, context, message and ISO time', () => {
    const text = formatMattermostMessage({
      level: 50,
      time: 0,
      context: 'AuthService',
      msg: 'Login failed',
    });
    expect(text).toContain('🔴 **[ERROR]** AuthService');
    expect(text).toContain('**Msg:** Login failed');
    expect(text).toContain('**Time:** 1970-01-01T00:00:00.000Z');
  });

  it('renders the nestjs-pino error shape (err object, no msg field)', () => {
    // logger.error(message, stack) with a bound context produces exactly this.
    const text = formatMattermostMessage({
      level: 50,
      context: 'AllExceptionsFilter',
      err: {
        type: 'Error',
        message: 'POST /api/x → 500',
        stack: 'Error: POST /api/x → 500\n    at fn (x.ts:1:1)',
      },
    });
    expect(text).toContain('**Msg:** POST /api/x → 500');
    expect(text).toContain('```');
    expect(text).toContain('    at fn (x.ts:1:1)');
    // context stays a context, not swallowed as a stack
    expect(text).toContain('**[ERROR]** AllExceptionsFilter');
  });

  it('falls back to treating a stack-shaped context as the stack', () => {
    const text = formatMattermostMessage({
      level: 60,
      context: 'TypeError: boom\n    at handler (a.ts:2:3)',
    });
    expect(text).toContain('💥 **[FATAL]**');
    expect(text).toContain('**Stack:**');
    expect(text).toContain('at handler');
  });

  it('includes request correlation bits when present', () => {
    const text = formatMattermostMessage({
      level: 40,
      msg: 'slow query',
      req: { method: 'GET', url: '/api/users' },
      res: { statusCode: 200 },
      requestId: 'req-1',
    });
    expect(text).toContain('GET /api/users · → 200 · req-id: req-1');
  });

  it('truncates oversized messages', () => {
    const text = formatMattermostMessage({ level: 50, msg: 'x'.repeat(10_000) });
    expect(text.length).toBeLessThanOrEqual(3900);
    expect(text.endsWith('…')).toBe(true);
  });
});

describe('buildWebhookPayload', () => {
  it('builds the Incoming Webhook payload', () => {
    const payload = buildWebhookPayload(
      { level: 50, msg: 'boom', context: 'AuthService', requestId: 'req-9' },
      { ...baseOptions, channel: '#alerts' },
    );
    expect(payload.text).toContain('**Msg:** boom');
    expect(payload.channel).toBe('#alerts');
    expect(payload.username).toBe('Nuxion API');
    expect(payload.props).toMatchObject({
      level: 'error',
      context: 'AuthService',
      requestId: 'req-9',
    });
  });
});

describe('createMattermostStream', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('posts a formatted payload to the webhook', async () => {
    const stream = createMattermostStream({ ...baseOptions, channel: '#alerts' });
    await writeAsync(stream, JSON.stringify({ level: 50, time: 0, msg: 'boom', context: 'X' }));
    await flush();

    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(baseOptions.webhookUrl);
    expect((init?.headers as Record<string, string>)['content-type']).toBe('application/json');
    const body = JSON.parse(init?.body as string);
    expect(body.channel).toBe('#alerts');
    expect(body.text).toContain('**Msg:** boom');
  });

  it('skips pino-http access logs when skipHttp is on', async () => {
    const stream = createMattermostStream({ ...baseOptions, skipHttp: true });
    const accessLog = JSON.stringify({
      level: 30,
      req: { method: 'GET', url: '/api/health' },
      res: { statusCode: 200 },
      responseTime: 2,
    });
    await writeAsync(stream, accessLog);
    await flush();
    expect(fetch).not.toHaveBeenCalled();

    await writeAsync(stream, JSON.stringify({ level: 40, msg: 'warn from app' }));
    await flush();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('ignores non-JSON lines without posting or throwing', async () => {
    const stream = createMattermostStream(baseOptions);
    await writeAsync(stream, 'not-json {{{');
    await flush();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retries once, then drops and warns', async () => {
    const fetchMock = vi
      .fn<FetchLike>()
      .mockRejectedValueOnce(new Error('down'))
      .mockRejectedValueOnce(new Error('still down'))
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const stream = createMattermostStream(baseOptions);
    await writeAsync(stream, JSON.stringify({ level: 50, msg: 'boom' }));
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(2); // one retry
    expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('delivery failed'));
  });

  it('caps the queue, drops the oldest, and reports the suppression count', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => (release = resolve));
    const fetchMock = vi
      .fn<FetchLike>()
      .mockImplementationOnce(() => gate.then(() => new Response(null, { status: 200 })))
      .mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const stream = createMattermostStream({ ...baseOptions, maxQueue: 2 });
    // r1 occupies the in-flight worker; r2..r4 overflow the queue of 2 → r2 dropped.
    await writeAsync(stream, JSON.stringify({ level: 50, msg: 'r1' }));
    await writeAsync(stream, JSON.stringify({ level: 50, msg: 'r2' }));
    await writeAsync(stream, JSON.stringify({ level: 50, msg: 'r3' }));
    await writeAsync(stream, JSON.stringify({ level: 50, msg: 'r4' }));
    release();
    await flush();

    const texts = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse((init?.body as string).toString()).text,
    );
    expect(texts.some((t) => t.includes('**Msg:** r1'))).toBe(true);
    expect(texts.some((t) => t.includes('**Msg:** r2'))).toBe(false);
    expect(texts.some((t) => t.includes('suppressed earlier'))).toBe(true);
  });
});
