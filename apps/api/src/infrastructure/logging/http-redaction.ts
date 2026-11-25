export const HTTP_LOG_REDACTIONS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
] as const;
