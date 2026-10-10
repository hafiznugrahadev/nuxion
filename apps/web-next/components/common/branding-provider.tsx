'use client';

import type { BrandingSettings } from '@nuxion/shared-types';
import { setBranding } from '@/lib/branding';
import { apiFetch } from '@/lib/use-api';
import { useEffect } from 'react';

/**
 * Owns the global branding store. `initial` comes from the root layout's
 * server-side fetch (SSR parity with the Nuxt variant's branding plugin); the
 * fallback fetch covers RSC payloads that arrive without it. Either way the
 * seed lands in an effect — one paint on the defaults at worst, never a
 * broken render. Settings → Branding keeps the store live via setBranding.
 */
export function BrandingProvider({
  initial,
  children,
}: {
  initial?: BrandingSettings;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Prefer the SSR-fetched branding; fall back to fetching it here.
    if (initial) {
      setBranding(initial);
      return;
    }
    let cancelled = false;
    void apiFetch<BrandingSettings>('/settings/branding')
      .then((branding) => {
        if (!cancelled) setBranding(branding);
      })
      .catch(() => {
        // Public endpoint unreachable (fresh install, API down) — defaults stay.
      });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  return <>{children}</>;
}
