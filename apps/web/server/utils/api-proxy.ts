import { Readable } from 'node:stream';
import {
  MAX_PROXY_BYTES,
  PROXY_TIMEOUT_MS,
  ProxyBodyLimitError,
  readBoundedBody,
} from '../../app/lib/proxy-body';
import type { H3Event } from 'h3';

// Hop-by-hop headers (RFC 7230 §6.1) must not be forwarded in either
// direction; `accept-encoding`/`content-length` are dropped so the framing we
// send is decided here, not inherited from the upstream.
const REQUEST_HOP_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'expect',
  'accept-encoding',
  'content-length',
]);
const RESPONSE_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'content-length',
  'content-encoding',
]);

/**
 * Forward a request to the API over the internal network. The browser only
 * ever talks to the web origin: /api/** and /uploads/** arrive here and are
 * proxied to `apiInternalBase` (API root, plain http, no public domain) —
 * one domain in Dokploy/OrbStack, no CORS, first-party cookies.
 *
 * Hand-rolled instead of h3's proxyRequest: buffering the body with an
 * explicit content-length sidesteps the doubled `transfer-encoding: chunked`
 * the nuxt-dev pipeline emits on streamed proxy responses (OrbStack's gateway
 * rejects it with 502). Request/response sizes here are JSON + avatar-scale
 * uploads, well within a buffered proxy.
 */
export async function proxyToApi(event: H3Event, prefix: '/api' | '/uploads') {
  const { apiInternalBase } = useRuntimeConfig();
  // event.path includes the query string — slice() keeps it intact.
  const target = `${apiInternalBase}${prefix}${event.path.slice(prefix.length)}`;

  const headers = new Headers();
  for (const [name, value] of Object.entries(getRequestHeaders(event))) {
    if (REQUEST_HOP_HEADERS.has(name)) continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(name, v));
    else if (value != null) headers.set(name, value);
  }

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Proxy deadline exceeded')),
    PROXY_TIMEOUT_MS,
  );
  try {
    const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(event.method);
    if (hasBody && Number(getRequestHeaders(event)['content-length']) > MAX_PROXY_BYTES) {
      return Response.json({ success: false, message: 'Payload Too Large' }, { status: 413 });
    }
    let raw: Uint8Array;
    try {
      const stream = hasBody
        ? (Readable.toWeb(event.node.req) as ReadableStream<Uint8Array>)
        : null;
      raw = await readBoundedBody(stream, controller.signal);
    } catch (error) {
      if (error instanceof ProxyBodyLimitError) {
        return Response.json({ success: false, message: 'Payload Too Large' }, { status: 413 });
      }
      throw error;
    }
    const upstream = await fetch(target, {
      method: event.method,
      headers,
      body: raw.byteLength ? (raw as BodyInit) : undefined,
      redirect: 'manual',
      signal: controller.signal,
    });
    if (Number(upstream.headers.get('content-length')) > MAX_PROXY_BYTES) {
      void upstream.body?.cancel().catch(() => undefined);
      throw new ProxyBodyLimitError('Upstream body exceeds limit');
    }
    const body = await readBoundedBody(upstream.body, controller.signal);
    const resHeaders = new Headers();
    for (const [name, value] of upstream.headers) {
      if (name === 'set-cookie' || RESPONSE_HOP_HEADERS.has(name)) continue;
      resHeaders.set(name, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) resHeaders.append('set-cookie', cookie);
    resHeaders.set('content-length', String(body.byteLength));
    const empty = event.method === 'HEAD' || [204, 205, 304].includes(upstream.status);
    return new Response(empty ? null : (body as BodyInit), {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  } catch {
    const status = controller.signal.aborted ? 504 : 502;
    return Response.json(
      { success: false, message: status === 504 ? 'Gateway Timeout' : 'Bad Gateway' },
      { status },
    );
  } finally {
    clearTimeout(timer);
  }
}
