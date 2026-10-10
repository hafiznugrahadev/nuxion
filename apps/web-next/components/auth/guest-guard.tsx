'use client';

import { ensureSession } from '@/lib/auth-api';
import { getAuthState, isAuthenticated, subscribeAuth } from '@/lib/auth-store';
import { intendedRedirect } from '@/lib/intended-redirect';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

/**
 * Route guard for guest-only pages (login, register) — the port of the Nuxt
 * guest middleware. The token lives in memory, so the check is client-side:
 * restore the session from the refresh cookie first (single-flight), then
 * bounce an authenticated user to where they were originally heading
 * (`?redirect=`, set by the admin guard when it lands) or their dashboard.
 * Until the check resolves, the children stay mounted under a veil — the
 * common case (no cookie) resolves after one silent fetch.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureSession().then(() => {
      if (cancelled) return;
      setChecked(true);
      if (isAuthenticated(getAuthState())) {
        router.replace(intendedRedirect(searchParams));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  return <div className={checked ? undefined : 'invisible'}>{children}</div>;
}
