import { describe, expect, it } from 'vitest';
import { ProxyBodyLimitError, readBoundedBody } from './proxy-body';

function stream(chunks: number[], cancel?: () => void) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const size of chunks) controller.enqueue(new Uint8Array(size).fill(65));
      controller.close();
    },
    cancel,
  });
}

describe('bounded proxy bodies', () => {
  it('accepts bytes up to the limit without changing multipart bytes', async () => {
    const result = await readBoundedBody(stream([2, 3]), new AbortController().signal, 5);
    expect([...result]).toEqual([65, 65, 65, 65, 65]);
  });
  it('counts streamed chunks rather than trusting content length', async () => {
    await expect(
      readBoundedBody(stream([3, 3]), new AbortController().signal, 5),
    ).rejects.toBeInstanceOf(ProxyBodyLimitError);
  });
  it('aborts an unfinished body without waiting for another byte', async () => {
    const controller = new AbortController();
    let cancelled = false;
    const source = new ReadableStream<Uint8Array>({
      cancel() {
        cancelled = true;
      },
    });
    const pending = readBoundedBody(source, controller.signal);
    controller.abort(new Error('deadline'));
    await expect(pending).rejects.toThrow('deadline');
    expect(cancelled).toBe(true);
  });
});
