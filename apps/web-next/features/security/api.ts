import type { Passkey, TwoFactorActivatePayload, TwoFactorSetupPayload } from './types';
import { apiFetch } from '@/lib/use-api';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';

/**
 * Account security fetchers (TOTP setup, recovery codes, passkeys) — all
 * authenticated `/auth/*` routes reached through the shared client so a
 * mid-session token expiry is transparently refreshed and retried. Port of
 * the Nuxt variant's features/security/api.
 */
export const securityApi = {
  twoFactorSetup(): Promise<TwoFactorSetupPayload> {
    return apiFetch<TwoFactorSetupPayload>('/auth/2fa/setup', { method: 'POST' });
  },
  twoFactorActivate(code: string): Promise<TwoFactorActivatePayload> {
    return apiFetch<TwoFactorActivatePayload>('/auth/2fa/activate', {
      method: 'POST',
      body: { code },
    });
  },
  regenerateRecoveryCodes(password: string): Promise<string[]> {
    return apiFetch<{ recoveryCodes: string[] }>('/auth/2fa/recovery/regenerate', {
      method: 'POST',
      body: { password },
    }).then((res) => res.recoveryCodes);
  },
  listPasskeys(): Promise<Passkey[]> {
    return apiFetch<Passkey[]>('/auth/passkeys');
  },
  passkeyRegisterOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
    return apiFetch<PublicKeyCredentialCreationOptionsJSON>('/auth/webauthn/register/options', {
      method: 'POST',
    });
  },
  passkeyRegisterVerify(name: string | undefined, response: unknown): Promise<Passkey> {
    return apiFetch<Passkey>('/auth/webauthn/register/verify', {
      method: 'POST',
      body: { name, response },
    });
  },
  removePasskey(id: string): Promise<null> {
    return apiFetch<null>(`/auth/passkeys/${id}`, { method: 'DELETE' });
  },
};
