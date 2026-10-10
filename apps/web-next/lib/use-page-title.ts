'use client';

import { useBranding } from '@/lib/branding';
import { useEffect } from 'react';

/**
 * Client pages can't export metadata — this hook gives them the Nuxt variant's
 * `useHead({ title: () => \`${title} · ${branding.appName}\` })` behaviour:
 * set the tab title once per mount, following the live branding name.
 */
export function usePageTitle(title: string) {
  const { appName } = useBranding();
  useEffect(() => {
    document.title = `${title} · ${appName}`;
  }, [title, appName]);
}
