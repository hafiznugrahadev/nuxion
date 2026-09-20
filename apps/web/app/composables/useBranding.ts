import { APP_NAME } from '~/lib/constants';
import type { BrandingSettings } from '@nuxion/shared-types';

/**
 * Global branding (app name, logo, favicon) — runtime state seeded by
 * plugins/branding.ts from the public GET /settings/branding (SSR embeds it in
 * the payload, so server-rendered pages paint the right name with no flash).
 * Components read this instead of the APP_NAME constant; null logo/favicon
 * fall back to the bundled assets.
 */
export function useBranding() {
  const branding = useState<BrandingSettings>('branding', () => ({
    appName: APP_NAME,
    logoUrl: null,
    faviconUrl: null,
  }));
  return branding;
}
