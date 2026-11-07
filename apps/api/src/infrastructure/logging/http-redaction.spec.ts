import { describe, expect, it } from 'vitest';
import pino from 'pino';
import { HTTP_LOG_REDACTIONS } from './http-redaction';

describe('HTTP credential log redaction', () => {
  it('redacts request cookies and authorization plus response Set-Cookie after serialization', () => {
    const output: string[] = [];
    const logger = pino(
      {
        redact: [...HTTP_LOG_REDACTIONS],
        serializers: { req: pino.stdSerializers.req, res: pino.stdSerializers.res },
      },
      {
        write: (chunk) => {
          output.push(chunk);
        },
      },
    );

    logger.info({
      req: {
        method: 'GET',
        url: '/api/users/me',
        headers: {
          cookie: 'better-auth.session_token=secret-session',
          authorization: 'Bearer secret-access',
        },
      },
      res: {
        statusCode: 200,
        getHeaders: () => ({
          'set-cookie': ['better-auth.session_token=secret-renewal; HttpOnly'],
        }),
      },
    });

    const line = output.join('');
    expect(line).toContain('/api/users/me');
    expect(line).toContain('[Redacted]');
    expect(line).not.toContain('secret-session');
    expect(line).not.toContain('secret-access');
    expect(line).not.toContain('secret-renewal');
  });
});
