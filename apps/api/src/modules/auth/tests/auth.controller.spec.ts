import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from '../auth.controller';
import type { AuthService } from '../auth.service';
import type { TwoFactorService } from '../two-factor.service';
import type { WebAuthnService } from '../webauthn.service';
import type { VerifyPasskeyLoginDto } from '../dto/webauthn.dto';

const user = {
  id: 'fixture',
  email: 'fixture@example.test',
  twoFactorEnabled: false,
  securityVersion: 0,
};
const dto = { challengeId: 'challenge', response: {} } as VerifyPasskeyLoginDto;

function setup(twoFactorEnabled: boolean, userVerified: boolean) {
  const auth = {
    refreshTtlDays: 7,
    issueSession: vi.fn(async () => ({
      accessToken: 'token',
      refreshToken: 'refresh',
      user,
      enrollmentRequired: false,
    })),
  };
  const twoFactor = { issueLoginChallenge: vi.fn(async () => 'totp-challenge') };
  const webauthn = {
    verifyLogin: vi.fn(async () => ({ user: { ...user, twoFactorEnabled }, userVerified })),
  };
  const config = { get: (key: string) => (key === 'app.twoFactor.enabled' ? true : undefined) };
  const controller = new AuthController(
    auth as unknown as AuthService,
    twoFactor as unknown as TwoFactorService,
    webauthn as unknown as WebAuthnService,
    config as ConfigService,
  );
  const response = { cookie: vi.fn() } as unknown as Response;
  return { controller, auth, twoFactor, response };
}

describe('Passkey MFA assurance', () => {
  it('keeps an unenrolled non-UV login at password assurance', async () => {
    const context = setup(false, false);
    await context.controller.passkeyLoginVerify(dto, context.response);
    expect(context.auth.issueSession).toHaveBeenCalledWith(expect.anything(), 'password');
  });
  it('allows a user-verified passkey to establish full assurance', async () => {
    const context = setup(false, true);
    await context.controller.passkeyLoginVerify(dto, context.response);
    expect(context.auth.issueSession).toHaveBeenCalledWith(expect.anything(), 'passkey');
  });
  it('requires a TOTP challenge for enrolled accounts without UV', async () => {
    const context = setup(true, false);
    const result = await context.controller.passkeyLoginVerify(dto, context.response);
    expect(result).toEqual({ twoFactorRequired: true, challengeId: 'totp-challenge' });
    expect(context.auth.issueSession).not.toHaveBeenCalled();
  });
});
