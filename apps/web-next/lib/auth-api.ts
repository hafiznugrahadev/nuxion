import type { ApiResponse } from '@nuxion/shared-types';
import {
  clearSession,
  getAuthState,
  getSessionGeneration,
  setSession,
  type SessionPayload,
} from './auth-store';
import { SessionRequests } from './session-requests';
import { xhrProgressEnd, xhrProgressStart } from './xhr-progress';

/**
 * Returned by login when the password was correct but the account has TOTP
 * enabled — no session yet. The challenge is consumed by the 2FA verify step
 * (ported with the two-factor stage); until then the login page shows a
 * notice and stays on the credentials step.
 */
export interface TwoFactorChallenge {
  twoFactorRequired: true;
  challengeId: string;
}

export type LoginResult = SessionPayload | TwoFactorChallenge;

// Browser-exposed flags are inlined at build time; same defaults as the
// Nuxt variant's runtime config.
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api';
export const REGISTRATION_ENABLED = process.env.NEXT_PUBLIC_REGISTRATION_ENABLED === 'true';
export const TWO_FACTOR_ENABLED = process.env.NEXT_PUBLIC_2FA_ENABLED === 'true';
export const PASSKEY_ENABLED = process.env.NEXT_PUBLIC_PASSKEY_ENABLED === 'true';
let logoutGeneration = -1;
const sessionRequests = new SessionRequests();
export function runSessionRequest<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  return sessionRequests.run(operation);
}

/**
 * Bare fetch with the YouTube-style top progress bar — for the user-visible
 * auth calls that deliberately bypass useApi (login must never recurse
 * through the 401 retry). `refresh()` stays untracked: it runs silently on
 * load / token expiry.
 */
async function trackedFetch<T>(
  url: string,
  opts: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: Record<string, unknown>;
  } = {},
): Promise<T> {
  xhrProgressStart();
  try {
    const res = await sessionRequests.run((signal) =>
      fetch(`${API_BASE}${url}`, {
        signal,
        method: opts.method ?? (opts.body ? 'POST' : 'GET'),
        headers: opts.body ? { 'content-type': 'application/json' } : undefined,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: 'include',
      }),
    );
    const body = (await res.json().catch(() => undefined)) as ApiResponse<T> | undefined;
    if (!res.ok || !body || body.success === false) {
      const err = new Error('Auth request failed') as Error & {
        data?: unknown;
        status?: number;
      };
      err.data = body;
      err.status = res.status;
      throw err;
    }
    return body.data as T;
  } finally {
    xhrProgressEnd();
  }
}

/** Password step of login. Returns a TwoFactorChallenge when TOTP is on. */
export async function login(email: string, password: string): Promise<LoginResult> {
  clearSession();
  const generation = getSessionGeneration();
  const data = await trackedFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (generation !== getSessionGeneration()) throw new Error('Session changed');
  if ('twoFactorRequired' in data) return data;
  if (!setSession(data, generation)) throw new Error('Session changed');
  return data;
}

/** Options JSON produced by the API for navigator.credentials.get(). */
export interface PasskeyLoginOptions {
  challengeId: string;
  options: import('@simplewebauthn/browser').PublicKeyCredentialRequestOptionsJSON;
}

/** Second step of login: consume the challenge with a TOTP/recovery code. */
export async function verifyTwoFactor(challengeId: string, code: string): Promise<void> {
  const generation = getSessionGeneration();
  const data = await trackedFetch<SessionPayload>('/auth/2fa/verify', {
    method: 'POST',
    body: { challengeId, code },
  });
  if (!setSession(data, generation)) throw new Error('Session changed');
}

/** Fetch a discoverable-credential login challenge (passkey sign-in). */
export async function passkeyLoginOptions(): Promise<PasskeyLoginOptions> {
  return trackedFetch<PasskeyLoginOptions>('/auth/webauthn/login/options', { method: 'POST' });
}

/** Verify the browser's assertion; returns a session or a 2FA challenge. */
export async function passkeyLoginVerify(
  challengeId: string,
  response: unknown,
): Promise<LoginResult> {
  clearSession();
  const generation = getSessionGeneration();
  const data = await trackedFetch<LoginResult>('/auth/webauthn/login/verify', {
    method: 'POST',
    body: { challengeId, response },
  });
  if (generation !== getSessionGeneration()) throw new Error('Session changed');
  if ('twoFactorRequired' in data) return data;
  if (!setSession(data, generation)) throw new Error('Session changed');
  return data;
}

/** Self-service registration (when enabled on the API). Logs the user in. */
export async function register(name: string, email: string, password: string): Promise<void> {
  clearSession();
  const generation = getSessionGeneration();
  const data = await trackedFetch<SessionPayload>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  if (!setSession(data, generation)) throw new Error('Session changed');
}

/** Exchange the refresh cookie for a new access token. Returns success. */
export async function refreshSession(): Promise<boolean> {
  const generation = getSessionGeneration();
  if (generation === logoutGeneration) return false;
  try {
    const res = await sessionRequests.run((signal) =>
      fetch(`${API_BASE}/auth/refresh`, {
        signal,
        method: 'POST',
        credentials: 'include',
      }),
    );
    const body = (await res.json().catch(() => undefined)) as
      ApiResponse<SessionPayload> | undefined;
    if (res.ok && body?.success) {
      return setSession(body.data, generation);
    }
  } catch {
    // Network failure — treat as logged out, same as an invalid cookie.
  }
  if (generation === getSessionGeneration()) clearSession();
  return false;
}

export async function logout(): Promise<void> {
  clearSession();
  logoutGeneration = getSessionGeneration();
  sessionPromise = null;
  try {
    await sessionRequests.logout((signal) =>
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        signal,
      }),
    );
  } catch {
    // Ignore — clear local state regardless.
  } finally {
    if (!getAuthState().user) logoutGeneration = getSessionGeneration();
  }
}

/** Request a password-reset email. Resolves regardless of account existence. */
export async function forgotPassword(email: string): Promise<void> {
  await trackedFetch<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

/** Complete a password reset with the emailed token. Throws on invalid/expired. */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await trackedFetch<{ message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, newPassword },
  });
}

/**
 * Single-flight session restore: the app bootstrap and every guard share one
 * refresh call, so a hard reload triggers exactly one /auth/refresh even when
 * several guarded components mount together.
 */
let sessionPromise: Promise<boolean> | null = null;
let sessionPromiseGeneration = -1;

export function ensureSession(): Promise<boolean> {
  const generation = getSessionGeneration();
  if (!sessionPromise || sessionPromiseGeneration !== generation) {
    sessionPromiseGeneration = generation;
    const pending = refreshSession().finally(() => {
      if (sessionPromise === pending) sessionPromise = null;
    });
    sessionPromise = pending;
  }
  return sessionPromise;
}
