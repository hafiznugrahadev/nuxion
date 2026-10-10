'use client';

import type { BrandingSettings } from '@nuxion/shared-types';
import { useSyncExternalStore } from 'react';

/**
 * Global branding (app name, logo, favicon) — the React port of the Nuxt
 * variant's useBranding global state. Defaults paint instantly (SSR renders
 * the defaults; no flash), and the BrandingProvider seeds the live values
 * from the public GET /settings/branding after mount. Null logo/favicon fall
 * back to the bundled assets at the call sites.
 */

const DEFAULT_BRANDING: BrandingSettings = {
  appName: 'Nuxion',
  logoUrl: null,
  faviconUrl: null,
};

let branding: BrandingSettings = DEFAULT_BRANDING;
const listeners = new Set<() => void>();

export function subscribeBranding(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

export function getBranding(): BrandingSettings {
  return branding;
}

export function setBranding(next: BrandingSettings): void {
  branding = next;
  for (const listener of listeners) listener();
}

/** Client hook mirroring the Nuxt composable contract. */
export function useBranding(): BrandingSettings {
  return useSyncExternalStore(subscribeBranding, getBranding, getBranding);
}
