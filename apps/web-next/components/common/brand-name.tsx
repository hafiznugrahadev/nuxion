'use client';

import { useBranding } from '@/lib/branding';

/**
 * Live app name — branding-store backed so Settings → Branding renames the
 * whole UI without a reload. Server components embed it wherever the Nuxt
 * variant reads `branding.appName`.
 */
export function BrandName({ className }: { className?: string }) {
  const { appName } = useBranding();
  return <span className={className}>{appName}</span>;
}
