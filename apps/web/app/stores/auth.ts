import { SessionRequests } from '~/lib/session-requests';
import { unwrap } from '~/lib/api-client';
import { defineStore } from 'pinia';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import { UserRole, type ApiResponse, type User } from '@nuxion/shared-types';
import { xhrProgressEnd, xhrProgressStart } from '~/lib/xhr-progress';

interface SessionPayload {
  accessToken: string;
  user: User;
  enrollmentRequired?: boolean;
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

const sessionRequests = new WeakMap<object, SessionRequests>();
function requestsFor(owner: object): SessionRequests {
  let requests = sessionRequests.get(owner);
  if (!requests) {
    requests = new SessionRequests();
    sessionRequests.set(owner, requests);
  }
  return requests;
}

export function runSessionRequest<T>(
  owner: object,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  return requestsFor(owner).run(operation);
}

const refreshFlights = new WeakMap<object, { generation: number; promise: Promise<boolean> }>();

/** Options JSON produced by the API for navigator.credentials.get(). */
export interface PasskeyLoginOptions {
  challengeId: string;
  options: PublicKeyCredentialRequestOptionsJSON;
}

/**
 * Bare $fetch with the YouTube-style top progress bar — for the auth store's
 * user-visible calls that deliberately bypass useApi (see login below).
 * `refresh()` stays untracked: it runs silently on load / token expiry.
 */
async function trackedFetch<T>(
  owner: object,
  apiBase: string,
  url: string,
  opts: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  xhrProgressStart();
  try {
    return await requestsFor(owner).run((signal) =>
      $fetch<T>(url, { baseURL: apiBase, credentials: 'include', ...opts, signal }),
    );
  } finally {
    xhrProgressEnd();
  }
}

/**
 * Client auth state (SPEC: Pinia for client state).
 *
 * Best practice with a NestJS JWT backend: the short-lived **access token lives in
 * memory only** (never localStorage — XSS-safe), and the long-lived refresh token
 * is an httpOnly cookie the browser sends automatically to `/auth/*`. On a hard
 * reload the in-memory token is gone, so `refresh()` silently restores the session
 * from the cookie (see `plugins/auth.client.ts`). The 401-retry in `useApi` calls
 * `refresh()` transparently when an access token expires mid-session.
 */
export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    accessToken: null as string | null,
    enrollmentRequired: false,
    sessionGeneration: 0,
    sessionRestoreBlocked: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isAdmin: (state) => state.user?.roles?.includes(UserRole.ADMIN) ?? false,
    isSuperAdmin: (state) => state.user?.roles?.includes(UserRole.SUPER_ADMIN) ?? false,
  },
  actions: {
    /** Base URL of the API, read from runtime config. */
    apiBase(): string {
      return useRuntimeConfig().public.apiBase as string;
    },

    setSession(payload: SessionPayload, expectedGeneration?: number): boolean {
      const generation = expectedGeneration ?? this.sessionGeneration;
      if (generation !== this.sessionGeneration) return false;
      if (
        this.user?.id !== payload.user.id ||
        this.enrollmentRequired !== (payload.enrollmentRequired ?? false)
      )
        this.sessionGeneration++;
      this.accessToken = payload.accessToken;
      this.user = payload.user;
      this.enrollmentRequired = payload.enrollmentRequired ?? false;
      this.sessionRestoreBlocked = false;
      return true;
    },

    clear() {
      this.sessionGeneration++;
      this.accessToken = null;
      this.user = null;
      this.enrollmentRequired = false;
    },

    /**
     * Password step of login. Returns a TwoFactorChallenge (no session set)
     * when the account has TOTP enabled — the caller must show the OTP form
     * and call verifyTwoFactor() to finish.
     */
    async login(email: string, password: string): Promise<LoginResult> {
      this.clear();
      const generation = this.sessionGeneration;
      // trackedFetch (bare $fetch) so login never recurses through the 401 retry.
      const res = await trackedFetch<ApiResponse<LoginResult>>(
        this,
        this.apiBase(),
        '/auth/login',
        {
          method: 'POST',
          body: { email, password },
        },
      );
      const data = unwrap(res);
      if (generation !== this.sessionGeneration) throw new Error('Session changed');
      if ('twoFactorRequired' in data) return data;
      if (!this.setSession(data, generation)) throw new Error('Session changed');
      return data;
    },

    /** Second step of login: consume the challenge with a TOTP/recovery code. */
    async verifyTwoFactor(challengeId: string, code: string): Promise<void> {
      const generation = this.sessionGeneration;
      const res = await trackedFetch<ApiResponse<SessionPayload>>(
        this,
        this.apiBase(),
        '/auth/2fa/verify',
        {
          method: 'POST',
          body: { challengeId, code },
        },
      );
      const data = unwrap(res);
      if (!this.setSession(data, generation)) throw new Error('Session changed');
    },

    /** Fetch a discoverable-credential login challenge (passkey sign-in). */
    async passkeyLoginOptions(): Promise<PasskeyLoginOptions> {
      const res = await trackedFetch<ApiResponse<PasskeyLoginOptions>>(
        this,
        this.apiBase(),
        '/auth/webauthn/login/options',
        { method: 'POST' },
      );
      const data = unwrap(res);
      return data;
    },

    /** Verify the browser's assertion; returns a session or a 2FA challenge. */
    async passkeyLoginVerify(challengeId: string, response: unknown): Promise<LoginResult> {
      this.clear();
      const generation = this.sessionGeneration;
      const res = await trackedFetch<ApiResponse<LoginResult>>(
        this,
        this.apiBase(),
        '/auth/webauthn/login/verify',
        { method: 'POST', body: { challengeId, response } },
      );
      const data = unwrap(res);
      if (generation !== this.sessionGeneration) throw new Error('Session changed');
      if ('twoFactorRequired' in data) return data;
      if (!this.setSession(data, generation)) throw new Error('Session changed');
      return data;
    },

    /** Self-service registration (when enabled on the API). Logs the user in. */
    async register(name: string, email: string, password: string) {
      this.clear();
      const generation = this.sessionGeneration;
      const res = await trackedFetch<ApiResponse<SessionPayload>>(
        this,
        this.apiBase(),
        '/auth/register',
        {
          method: 'POST',
          body: { name, email, password },
        },
      );
      const data = unwrap(res);
      if (!this.setSession(data, generation)) throw new Error('Session changed');
    },

    /** Exchange the refresh cookie for a new access token. Returns success. */
    async refresh(): Promise<boolean> {
      if (this.sessionRestoreBlocked) return false;
      const generation = this.sessionGeneration;
      const running = refreshFlights.get(this);
      if (running?.generation === generation) return running.promise;
      const promise = (async () => {
        try {
          const res = await requestsFor(this).run((signal) =>
            $fetch<ApiResponse<SessionPayload>>('/auth/refresh', {
              signal,
              baseURL: this.apiBase(),
              method: 'POST',
              credentials: 'include',
            }),
          );
          if (res.success) return this.setSession(res.data, generation);
        } catch {
          // A failed old refresh must not clear a newer identity.
        }
        if (generation === this.sessionGeneration) this.clear();
        return false;
      })().finally(() => {
        if (refreshFlights.get(this)?.promise === promise) refreshFlights.delete(this);
      });
      refreshFlights.set(this, { generation, promise });
      return promise;
    },

    async logout() {
      this.sessionRestoreBlocked = true;
      this.clear();
      try {
        await requestsFor(this).logout((signal) =>
          $fetch('/auth/logout', {
            baseURL: this.apiBase(),
            method: 'POST',
            credentials: 'include',
            signal,
          }),
        );
      } catch {
        // Ignore — clear local state regardless.
      }
    },

    /** Request a password-reset email. Resolves regardless of account existence. */
    async forgotPassword(email: string): Promise<void> {
      const res = await trackedFetch<ApiResponse<{ message: string }>>(
        this,
        this.apiBase(),
        '/auth/forgot-password',
        { method: 'POST', body: { email } },
      );
      unwrap(res);
    },

    /** Complete a password reset with the emailed token. Throws on invalid/expired. */
    async resetPassword(token: string, newPassword: string): Promise<void> {
      const res = await trackedFetch<ApiResponse<{ message: string }>>(
        this,
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
