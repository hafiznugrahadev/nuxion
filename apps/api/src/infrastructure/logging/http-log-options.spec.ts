import { Logger } from '@nestjs/common';
import pino from 'pino';
import { describe, expect, it, vi } from 'vitest';
import { httpLogOptions } from './http-log-options';
import { LogMailTransport } from '../mail/transports/log.transport';

describe('sensitive logging', () => {
  it('keeps operational HTTP fields without credentials or query secrets', () => {
    const lines: string[] = [];
    const logger = pino(httpLogOptions, { write: (line: string) => lines.push(line) });
    logger.info(
      {
        req: {
          id: 'fixture-request',
          method: 'GET',
          url: '/reset?token=RESET_MARKER',
          headers: { authorization: 'Bearer AUTH_MARKER', cookie: 'refresh=COOKIE_MARKER' },
        },
        res: { statusCode: 200, headers: { 'set-cookie': ['refresh=RESPONSE_MARKER'] } },
        err: new Error('ERROR_MARKER https://fixture.invalid/?token=ERROR_TOKEN_MARKER'),
      },
      'request completed',
    );
    const output = lines.join('');
    expect(output).not.toMatch(
      /RESET_MARKER|AUTH_MARKER|COOKIE_MARKER|RESPONSE_MARKER|ERROR_MARKER|ERROR_TOKEN_MARKER/,
    );
    expect(JSON.parse(lines[0]).req).toMatchObject({
      id: 'fixture-request',
      method: 'GET',
      url: '/reset',
    });
    expect(JSON.parse(lines[0]).res.statusCode).toBe(200);
  });

  it('does not log reset emails or addresses through the development sink', async () => {
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    try {
      await new LogMailTransport().send(
        {
          to: 'RECIPIENT_MARKER',
          subject: 'SUBJECT_MARKER',
          text: 'https://fixture.invalid/reset?token=RESET_MARKER',
          html: '<b>HTML_MARKER</b>',
        },
        'FROM_MARKER',
      );
      expect(log).toHaveBeenCalledOnce();
      expect(JSON.stringify(log.mock.calls)).not.toMatch(
        /RECIPIENT_MARKER|SUBJECT_MARKER|RESET_MARKER|HTML_MARKER|FROM_MARKER/,
      );
      expect(log.mock.calls[0][0]).toContain('delivery skipped');
    } finally {
      log.mockRestore();
    }
  });
});
