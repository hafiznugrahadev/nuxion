import type { ApiResponse } from '@nuxion/shared-types';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';
import { unwrap } from '~/lib/api-client';
import { useApi } from '~/composables/useApi';
import type { Passkey, TwoFactorActivatePayload, TwoFactorSetupPayload } from '../types';

/**
 * Account security fetchers (TOTP setup, recovery codes, passkeys) — all
 * authenticated `/auth/*` routes reached through the shared client so a
 * mid-session token expiry is transparently refreshed and retried.
 */
export function useSecurityApi() {
  const api = useApi();

  return {
    twoFactorSetup(): Promise<TwoFactorSetupPayload> {
      return api<ApiResponse<TwoFactorSetupPayload>>('/auth/2fa/setup', { method: 'POST' }).then(
        unwrap,
      );
    },

    twoFactorActivate(code: string): Promise<TwoFactorActivatePayload> {
      return api<ApiResponse<TwoFactorActivatePayload>>('/auth/2fa/activate', {
        method: 'POST',
        body: { code },
      }).then(unwrap);
    },

    regenerateRecoveryCodes(password: string): Promise<string[]> {
      return api<ApiResponse<{ recoveryCodes: string[] }>>('/auth/2fa/recovery/regenerate', {
        method: 'POST',
        body: { password },
      }).then((res) => unwrap(res).recoveryCodes);
    },

    listPasskeys(): Promise<Passkey[]> {
      return api<ApiResponse<Passkey[]>>('/auth/passkeys').then(unwrap);
    },

    passkeyRegisterOptions(): Promise<PublicKeyCredentialCreationOptionsJSON> {
      return api<ApiResponse<PublicKeyCredentialCreationOptionsJSON>>(
        '/auth/webauthn/register/options',
        { method: 'POST' },
      ).then(unwrap);
    },

    passkeyRegisterVerify(name: string | undefined, response: unknown): Promise<Passkey> {
      return api<ApiResponse<Passkey>>('/auth/webauthn/register/verify', {
        method: 'POST',
        body: { name, response },
      }).then(unwrap);
    },

    removePasskey(id: string): Promise<null> {
      return api<ApiResponse<null>>(`/auth/passkeys/${id}`, { method: 'DELETE' }).then(unwrap);
    },
  };
}
