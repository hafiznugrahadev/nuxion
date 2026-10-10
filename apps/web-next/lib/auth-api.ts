import type { ApiResponse } from '@nuxion/shared-types';
import { clearSession, setSession, type SessionPayload } from './auth-store';
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
    const res = await fetch(`${API_BASE}${url}`, {
      method: opts.method ?? (opts.body ? 'POST' : 'GET'),
      headers: opts.body ? { 'content-type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'include',
    });
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
  const data = await trackedFetch<LoginResult>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if ('twoFactorRequired' in data) return data;
  setSession(data);
  return data;
}

/** Self-service registration (when enabled on the API). Logs the user in. */
export async function register(name: string, email: string, password: string): Promise<void> {
  const data = await trackedFetch<SessionPayload>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  setSession(data);
}

/** Exchange the refresh cookie for a new access token. Returns success. */
export async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    const body = (await res.json().catch(() => undefined)) as
      ApiResponse<SessionPayload> | undefined;
    if (res.ok && body?.success) {
      setSession(body.data);
      return true;
    }
  } catch {
    // Network failure — treat as logged out, same as an invalid cookie.
  }
  clearSession();
  return false;
}

export async function logout(): Promise<void> {
  try {
    await trackedFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore — clear local state regardless.
  }
  clearSession();
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

export function ensureSession(): Promise<boolean> {
  sessionPromise ??= refreshSession().finally(() => {
    sessionPromise = null;
  });
  return sessionPromise;
}
