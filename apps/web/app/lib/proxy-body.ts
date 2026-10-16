export const MAX_PROXY_BYTES = 16 * 1024 * 1024;
export const PROXY_TIMEOUT_MS = 30_000;

export class ProxyBodyLimitError extends Error {}

export async function readBoundedBody(
  stream: ReadableStream<Uint8Array> | null,
  signal: AbortSignal,
  limit = MAX_PROXY_BYTES,
): Promise<Uint8Array> {
  if (signal.aborted) throw signal.reason;
  if (!stream) return new Uint8Array();
  const reader = stream.getReader();
  let onAbort: () => void = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
  });
  let complete = false;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new ProxyBodyLimitError('Proxy body exceeds limit');
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    complete = true;
    return body;
  } finally {
    signal.removeEventListener('abort', onAbort);
    if (!complete) void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
