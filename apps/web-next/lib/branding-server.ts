import { cache } from 'react';
import type { BrandingSettings } from '@nuxion/shared-types';

const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'Nuxion',
  logoUrl: null,
  faviconUrl: null,
};

/**
 * Server-side branding — the SSR half of the Nuxt variant's branding plugin:
 * the root layout and generateMetadata read the public settings endpoint over
 * the internal network so server-rendered titles/chrome carry the real app
 * name with no client-side flash. React `cache` dedupes per request; a
 * 60s revalidate keeps it fresh without hammering the API. Any failure falls
 * back to the defaults — branding must never break rendering.
 */
export const getBranding = cache(async (): Promise<BrandingSettings> => {
  const base = process.env.NEXT_API_INTERNAL_BASE ?? 'http://localhost:8000';
  try {
    const res = await fetch(`${base}/api/settings/branding`, {
      next: { revalidate: 60 },
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return DEFAULT_BRANDING;
    const body = (await res.json()) as { success: boolean; data?: BrandingSettings };
    return body.success && body.data ? { ...DEFAULT_BRANDING, ...body.data } : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
});
