import {
  MAX_PROXY_BYTES,
  PROXY_TIMEOUT_MS,
  ProxyBodyLimitError,
  readBoundedBody,
} from './proxy-body';

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
 * Forward a request to the API over the internal network — the Next-variant
 * port of the Nuxt variant's Nitro proxy (same single-public-origin design:
 * /api/** and /uploads/** arrive here and are proxied to the API root, plain
 * http, no public domain; one domain in Dokploy/OrbStack, no CORS,
 * first-party cookies).
 *
 * Implemented as buffered route handlers instead of `rewrites()` because
 * Next bakes env-interpolated rewrites into routes-manifest.json at build
 * time — the internal API base must stay runtime-configurable (the compose
 * contract). Buffering with an explicit content-length also matches the
 * proven Nitro behaviour under the OrbStack gateway.
 */
export async function proxyToApi(req: Request, prefix: '/api' | '/uploads'): Promise<Response> {
  const base = process.env.NEXT_API_INTERNAL_BASE ?? 'http://localhost:8000';
  const incoming = new URL(req.url);
  const target = `${base}${prefix}${incoming.pathname.slice(prefix.length)}${incoming.search}`;

  const headers = new Headers();
  req.headers.forEach((value, name) => {
    if (!REQUEST_HOP_HEADERS.has(name)) headers.append(name, value);
  });

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error('Proxy deadline exceeded')),
    PROXY_TIMEOUT_MS,
  );
  let upstream: Response | undefined;
  try {
    const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
    if (hasBody && Number(req.headers.get('content-length')) > MAX_PROXY_BYTES) {
      return Response.json({ success: false, message: 'Payload Too Large' }, { status: 413 });
    }
    let raw: Uint8Array;
    try {
      raw = await readBoundedBody(hasBody ? req.body : null, controller.signal);
    } catch (error) {
      if (error instanceof ProxyBodyLimitError) {
        return Response.json({ success: false, message: 'Payload Too Large' }, { status: 413 });
      }
      throw error;
    }
    upstream = await fetch(target, {
      method: req.method,
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
    upstream.headers.forEach((value, name) => {
      if (name === 'set-cookie' || RESPONSE_HOP_HEADERS.has(name)) return;
      resHeaders.set(name, value);
    });
    for (const cookie of upstream.headers.getSetCookie()) resHeaders.append('set-cookie', cookie);
    resHeaders.set('content-length', String(body.byteLength));
    const empty = req.method === 'HEAD' || [204, 205, 304].includes(upstream.status);
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
