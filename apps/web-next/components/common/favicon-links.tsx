'use client';

import { useBranding } from '@/lib/branding';
import { useEffect } from 'react';

/**
 * Branding-aware favicon, mirroring the Nuxt variant's reactive head links:
 * the bundled icon ships as the static fallback in the root layout (correct
 * pre-paint), and an uploaded favicon (Settings → Branding) takes over once
 * the branding store resolves.
 */
export function FaviconLinks() {
  const { faviconUrl } = useBranding();

  useEffect(() => {
    if (!faviconUrl) return;
    for (const rel of ['icon', 'apple-touch-icon']) {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement('link');
        link.rel = rel;
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  return null;
}
