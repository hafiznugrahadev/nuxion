'use client';

import type { BrandingSettings } from '@nuxion/shared-types';
import { setBranding } from '@/lib/branding';
import { apiFetch } from '@/lib/use-api';
import { useEffect } from 'react';

/**
 * Seeds the global branding store from the public settings endpoint once per
 * load. Reads go through the shared client (same-origin proxy → API); a
 * failure keeps the defaults — branding must never break the shell.
 */
export function BrandingProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
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
  }, []);

  return <>{children}</>;
}
