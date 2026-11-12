import type { ArgumentsHost } from '@nestjs/common';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('exception confidentiality', () => {
  it.each([
    new Error('SECRET_MARKER: https://fixture.invalid/?token=TOKEN_MARKER'),
    new InternalServerErrorException('SECRET_MARKER'),
  ])('returns generic failures and omits credentials from logs', (exception) => {
    const errorLog = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', path: '/reset', url: '/reset?token=TOKEN_MARKER' }),
      }),
    } as unknown as ArgumentsHost;
    try {
      new AllExceptionsFilter().catch(exception, host);
      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error', path: '/reset' }),
      );
      expect(JSON.stringify({ logs: errorLog.mock.calls, response: json.mock.calls })).not.toMatch(
        /SECRET_MARKER|TOKEN_MARKER/,
      );
      expect(errorLog).toHaveBeenCalledOnce();
    } finally {
      errorLog.mockRestore();
    }
  });
});
