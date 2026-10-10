import { proxyToApi } from '@/lib/server/proxy';

// Same-origin /api proxy — see lib/server/proxy.ts for why this is a route
// handler instead of a rewrite. Every method the API serves is forwarded.
export const GET = (req: Request) => proxyToApi(req, '/api');
export const HEAD = (req: Request) => proxyToApi(req, '/api');
export const POST = (req: Request) => proxyToApi(req, '/api');
export const PUT = (req: Request) => proxyToApi(req, '/api');
export const PATCH = (req: Request) => proxyToApi(req, '/api');
export const DELETE = (req: Request) => proxyToApi(req, '/api');
export const OPTIONS = (req: Request) => proxyToApi(req, '/api');
