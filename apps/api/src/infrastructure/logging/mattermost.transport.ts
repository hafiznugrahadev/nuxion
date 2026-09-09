import { Writable } from 'node:stream';

/**
 * Mattermost log driver — a Pino destination stream that pushes log records to a
 * self-hosted Mattermost channel via an Incoming Webhook. Wired as a second
 * `pino.multistream` entry next to the normal stdout/pretty stream, so delivery
 * is fire-and-forget: the app must keep working (and keep logging) when
 * Mattermost is unreachable.
 *
 * Not a Nest provider — consumed directly by `LoggerModule.forRootAsync` in
 * app.module.ts, mirroring how the rest of src/infrastructure is consumed.
 */

export type MattermostLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/** Canonical pino level order (lower = more verbose). */
const LEVEL_ORDER: Record<MattermostLogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/** Lowest (most verbose) of the given levels — pino.multistream requires the
 * logger level to be the minimum across all its streams. */
export function lowestLogLevel(...levels: MattermostLogLevel[]): MattermostLogLevel {
  return levels.reduce((min, level) => (LEVEL_ORDER[level] < LEVEL_ORDER[min] ? level : min));
}

export interface MattermostStreamOptions {
  /** Mattermost Incoming Webhook URL (required — caller validates it). */
  webhookUrl: string;
  /** Override the channel the webhook posts to. */
  channel?: string;
  /** Sender name shown in Mattermost. */
  username?: string;
  /** Skip pino-http's automatic per-request access logs (default true). */
  skipHttp?: boolean;
  /** Max queued messages before dropping the oldest ones (default 100). */
  maxQueue?: number;
}

export interface MattermostPayload {
  text: string;
  channel?: string;
  username?: string;
  props?: Record<string, unknown>;
}

/**
 * Minimal shape of a serialized pino record line. Extra care for the two ways
 * nestjs-pino reports errors (see nestjs-pino/dist/Logger.js):
 * - `logger.error(msg, stack)` with a bound context → `{ context, err: { message, stack } }`
 *   (pino's default `err` stdSerializer provides type/message/stack)
 * - stack accidentally landing in `context` when no context was bound.
 */
export interface PinoRecord {
  level: number;
  time?: number;
  msg?: string;
  context?: string;
  err?: { type?: string; message?: string; stack?: string };
  stack?: string;
  trace?: string;
  req?: { method?: string; url?: string };
  res?: { statusCode?: number };
  responseTime?: number;
  requestId?: string;
}

const LEVEL_EMOJI: Record<number, string> = {
  60: '💥',
  50: '🔴',
  40: '⚠️',
  30: 'ℹ️',
  20: '🐛',
  10: '🔍',
};

function levelName(level: number): string {
  return (
    (Object.keys(LEVEL_ORDER) as MattermostLogLevel[]).find((k) => LEVEL_ORDER[k] === level) ??
    'log'
  );
}

function looksLikeStack(value: string): boolean {
  return /\n\s*at /.test(value);
}

/** pino-http writes one access log per request — at info level these would spam
 * the channel when the driver is opened up, so they can be filtered out. */
export function isHttpAccessLog(record: PinoRecord): boolean {
  return (
    record.req !== undefined && record.res !== undefined && typeof record.responseTime === 'number'
  );
}

// Mattermost rejects posts over ~4000 chars; leave headroom for the fence.
const MAX_MESSAGE_CHARS = 3900;
const MAX_STACK_CHARS = 2000;

/**
 * Pure formatter: pino record → Mattermost markdown message. Exported for tests.
 */
export function formatMattermostMessage(record: PinoRecord): string {
  const emoji = LEVEL_EMOJI[record.level] ?? 'ℹ️';
  const name = levelName(record.level).toUpperCase();
  const context =
    typeof record.context === 'string' && !looksLikeStack(record.context)
      ? record.context
      : undefined;
  const stack =
    record.err?.stack ??
    record.stack ??
    record.trace ??
    (typeof record.context === 'string' && looksLikeStack(record.context)
      ? record.context
      : undefined);
  const message = record.msg ?? record.err?.message ?? '(no message)';

  const lines: string[] = [];
  lines.push(`${emoji} **[${name}]**${context ? ` ${context}` : ''}`);
  lines.push(`**Msg:** ${message}`);
  if (record.time !== undefined) lines.push(`**Time:** ${new Date(record.time).toISOString()}`);

  const requestBits: string[] = [];
  if (record.req?.method && record.req?.url)
    requestBits.push(`${record.req.method} ${record.req.url}`);
  if (record.res?.statusCode) requestBits.push(`→ ${record.res.statusCode}`);
  if (record.requestId) requestBits.push(`req-id: ${record.requestId}`);
  if (requestBits.length > 0) lines.push(requestBits.join(' · '));

  if (stack) {
    const body = stack.length > MAX_STACK_CHARS ? `${stack.slice(0, MAX_STACK_CHARS)}\n…` : stack;
    lines.push('**Stack:**', '```', body, '```');
  }

  const text = lines.join('\n');
  return text.length > MAX_MESSAGE_CHARS ? `${text.slice(0, MAX_MESSAGE_CHARS - 1)}…` : text;
}

/** pino record → complete Incoming Webhook payload. */
export function buildWebhookPayload(
  record: PinoRecord,
  options: MattermostStreamOptions,
): MattermostPayload {
  return {
    text: formatMattermostMessage(record),
    channel: options.channel || undefined,
    username: options.username || undefined,
    props: {
      level: levelName(record.level),
      context: record.context,
      requestId: record.requestId,
    },
  };
}

// Delivery guardrails: serial queue so an error storm can't flood the channel
// or pile up HTTP calls in-process, bounded queue with drop counting, and a
// throttled stderr warning instead of console.*/pino (avoids log recursion).
const DEFAULT_MAX_QUEUE = 100;
const DEFAULT_TIMEOUT_MS = 5_000;
const WARN_THROTTLE_MS = 30_000;

/**
 * Create the Mattermost destination stream for pino.multistream. Writes are
 * non-blocking: `write()` only enqueues; a single async worker POSTs to the
 * webhook, retrying once before dropping.
 */
export function createMattermostStream(options: MattermostStreamOptions): Writable {
  const maxQueue = options.maxQueue ?? DEFAULT_MAX_QUEUE;
  const queue: MattermostPayload[] = [];
  let dropped = 0;
  let draining = false;
  let lastWarnAt = 0;

  const warnThrottled = (message: string): void => {
    const now = Date.now();
    if (now - lastWarnAt < WARN_THROTTLE_MS) return;
    lastWarnAt = now;
    process.stderr.write(`[mattermost-transport] ${message}\n`);
  };

  const post = async (payload: MattermostPayload): Promise<boolean> => {
    try {
      const response = await fetch(options.webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const drain = async (): Promise<void> => {
    if (draining) return;
    draining = true;
    try {
      while (queue.length > 0) {
        const payload = queue.shift() as MattermostPayload;
        const ok = (await post(payload)) || (await post(payload));
        if (ok) {
          // Surface what was lost once delivery recovers, then reset the counter.
          if (dropped > 0) {
            queue.push({
              text: `⚠️ ${dropped} log message(s) suppressed earlier (queue full or Mattermost unreachable).`,
            });
            dropped = 0;
          }
        } else {
          dropped++;
          warnThrottled('Mattermost webhook delivery failed; message dropped.');
        }
      }
    } finally {
      draining = false;
    }
  };

  return new Writable({
    write(chunk, _encoding, callback) {
      try {
        const record = JSON.parse(chunk.toString()) as PinoRecord;
        const skip = options.skipHttp !== false && isHttpAccessLog(record);
        if (!skip) {
          if (queue.length >= maxQueue) {
            queue.shift();
            dropped++;
          }
          queue.push(buildWebhookPayload(record, options));
          void drain();
        }
      } catch {
        // Not a JSON log line — ignore rather than break the logging pipeline.
      }
      callback();
    },
  });
}
