import { unwrap } from '~/lib/api-client';
import { defineStore } from 'pinia';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { UserRole, type ApiResponse, type User } from '@nuxion/shared-types';
import { xhrProgressEnd, xhrProgressStart } from '~/lib/xhr-progress';

interface SessionPayload {
  user: User;
}

/**
 * Returned by login when the password was correct but the account has TOTP
 * enabled — no session yet. The challenge is consumed by verifyTwoFactor().
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
}

export type LoginResult = SessionPayload | TwoFactorChallenge;

const sessionRequests = new WeakMap<object, Promise<boolean>>();

/** Options JSON produced by the API for navigator.credentials.get(). */
export interface PasskeyLoginOptions {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

/**
 * Bare $fetch with the YouTube-style top progress bar — for the auth store's
 * user-visible calls that deliberately bypass session invalidation.
 * Session restoration stays untracked.
 */
async function trackedFetch<T>(
  apiBase: string,
  url: string,
  opts: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  xhrProgressStart();
  try {
    return await $fetch<T>(url, { baseURL: apiBase, credentials: 'include', ...opts });
  } finally {
    xhrProgressEnd();
  }
}

/** Only the public user projection lives in Pinia; the session cookie is HttpOnly. */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
    isAdmin: (state) => state.user?.roles?.includes(UserRole.ADMIN) ?? false,
    isSuperAdmin: (state) => state.user?.roles?.includes(UserRole.SUPER_ADMIN) ?? false,
  },
  actions: {
    /** Base URL of the API, read from runtime config. */
    apiBase(): string {
      return useRuntimeConfig().public.apiBase as string;
    },

    setSession(payload: SessionPayload) {
      this.user = payload.user;
    },

    clear() {
      this.user = null;
    },

    /**
     * Password step of login. Returns a TwoFactorChallenge (no session set)
     * when the account has TOTP enabled — the caller must show the OTP form
     * and call verifyTwoFactor() to finish.
     */
    async login(email: string, password: string): Promise<LoginResult> {
      const res = await trackedFetch<ApiResponse<LoginResult>>(this.apiBase(), '/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      const data = unwrap(res);
      if ('twoFactorRequired' in data) return data;
      this.setSession(data);
      return data;
    },

    /** Second step of login: consume the challenge with a TOTP/recovery code. */
    async verifyTwoFactor(challengeId: string, code: string): Promise<void> {
      const res = await trackedFetch<ApiResponse<SessionPayload>>(
        this.apiBase(),
        '/auth/2fa/verify',
        {
          method: 'POST',
          body: { challengeId, code },
        },
      );
      const data = unwrap(res);
      this.setSession(data);
    },

    /** Fetch a discoverable-credential login challenge (passkey sign-in). */
    async passkeyLoginOptions(): Promise<PasskeyLoginOptions> {
      const res = await trackedFetch<ApiResponse<PasskeyLoginOptions>>(
        this.apiBase(),
        '/auth/webauthn/login/options',
        { method: 'POST' },
      );
      const data = unwrap(res);
      return data;
    },

    /** Verify the browser's assertion; returns a session or a 2FA challenge. */
    async passkeyLoginVerify(challengeId: string, response: unknown): Promise<LoginResult> {
      const res = await trackedFetch<ApiResponse<LoginResult>>(
        this.apiBase(),
        '/auth/webauthn/login/verify',
        { method: 'POST', body: { challengeId, response } },
      );
      const data = unwrap(res);
      if ('twoFactorRequired' in data) return data;
      this.setSession(data);
      return data;
    },

    /** Self-service registration (when enabled on the API). Logs the user in. */
    async register(name: string, email: string, password: string) {
      const res = await trackedFetch<ApiResponse<SessionPayload>>(
        this.apiBase(),
        '/auth/register',
        {
          method: 'POST',
          body: { name, email, password },
        },
      );
      const data = unwrap(res);
      this.setSession(data);
    },

    /** Restore the public user projection from the HttpOnly session cookie. */
    restoreSession(): Promise<boolean> {
      const pending = sessionRequests.get(this);
      if (pending) return pending;
      const request = (async () => {
        try {
          const res = await $fetch<ApiResponse<SessionPayload>>('/auth/session', {
            baseURL: this.apiBase(),
            method: 'GET',
            credentials: 'include',
            cache: 'no-store',
            retry: 0,
          });
          if (res.success) {
            this.setSession(res.data);
            return true;
          }
        } catch {
          // An unavailable or expired session cannot authenticate the UI.
        }
        this.clear();
        return false;
      })().finally(() => sessionRequests.delete(this));
      sessionRequests.set(this, request);
      return request;
    },

    async logout() {
      try {
        await trackedFetch(this.apiBase(), '/auth/logout', { method: 'POST' });
      } catch {
        // Ignore — clear local state regardless.
      }
      this.clear();
    },

    /** Request a password-reset email. Resolves regardless of account existence. */
    async forgotPassword(email: string): Promise<void> {
      const res = await trackedFetch<ApiResponse<{ message: string }>>(
        this.apiBase(),
        '/auth/forgot-password',
        { method: 'POST', body: { email } },
      );
      unwrap(res);
    },

    /** Complete a password reset with the emailed token. Throws on invalid/expired. */
    async resetPassword(token: string, newPassword: string): Promise<void> {
      const res = await trackedFetch<ApiResponse<{ message: string }>>(
        this.apiBase(),
        '/auth/reset-password',
        {
          method: 'POST',
          body: { token, newPassword },
        },
      );
      unwrap(res);
    },
  },
});
