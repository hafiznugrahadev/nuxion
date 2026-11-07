import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SmtpMailTransport } from '@infrastructure/mail/transports/smtp.transport';

describe('password reset availability', () => {
  it('rejects requests before account lookup or token issuance when delivery is disabled', async () => {
    const db = { select: vi.fn() };
    const betterAuth = { forgotPassword: vi.fn() };
    const service = new AuthService(
      db as never,
      { get: (key: string) => (key === 'app.passwordReset.enabled' ? false : undefined) } as never,
      {} as never,
      {} as never,
      betterAuth as never,
      {} as never,
    );

    await expect(service.forgotPassword('any@example.test')).rejects.toMatchObject({
      status: 503,
      response: { message: 'Password reset is temporarily unavailable' },
    });
    expect(db.select).not.toHaveBeenCalled();
    expect(betterAuth.forgotPassword).not.toHaveBeenCalled();
  });

  it('constructs the SMTP transport without connecting or verifying blank credentials', () => {
    expect(
      () => new SmtpMailTransport({ host: '', password: '', port: 587, secure: false }),
    ).not.toThrow();
  });
});
