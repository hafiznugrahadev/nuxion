import { proxyToApi } from '@/lib/server/proxy';

// Same-origin /uploads proxy (local-driver storage served by the API).
export const GET = (req: Request) => proxyToApi(req, '/uploads');
export const HEAD = (req: Request) => proxyToApi(req, '/uploads');
export const POST = (req: Request) => proxyToApi(req, '/uploads');
export const PUT = (req: Request) => proxyToApi(req, '/uploads');
export const PATCH = (req: Request) => proxyToApi(req, '/uploads');
export const DELETE = (req: Request) => proxyToApi(req, '/uploads');
export const OPTIONS = (req: Request) => proxyToApi(req, '/uploads');
