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

  const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(event.method);
  let res: Response;
  try {
    res = await fetch(target, {
      method: event.method,
      headers,
      body: hasBody ? await readRawBody(event, false) : undefined,
      redirect: 'manual',
    });
  } catch (error) {
    throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', cause: error });
  }

  const resHeaders = new Headers();
  for (const [name, value] of res.headers) {
    if (name === 'set-cookie' || RESPONSE_HOP_HEADERS.has(name)) continue;
    resHeaders.set(name, value);
  }
  for (const cookie of res.headers.getSetCookie()) {
    resHeaders.append('set-cookie', cookie);
  }

  const body = await res.arrayBuffer();
  resHeaders.set('content-length', String(body.byteLength));

  return new Response(body, {
    status: res.status,
    statusText: res.statusText,
    headers: resHeaders,
  });
}
