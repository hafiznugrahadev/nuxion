import type { BrandingSettings } from '@nuxion/shared-types';
import { apiFetch } from '@/lib/use-api';

export interface UpdateBrandingInput {
  appName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

/**
 * Settings fetchers (SUPER_ADMIN-writable groups). Reads could also use the
 * public endpoint, but going through the shared client keeps the Bearer +
 * transparent refresh and the react-query cache in one place.
 */
export const settingsApi = {
  getBranding(): Promise<BrandingSettings> {
    return apiFetch<BrandingSettings>('/settings/branding');
  },
  updateBranding(input: UpdateBrandingInput): Promise<BrandingSettings> {
    return apiFetch<BrandingSettings>('/settings/branding', { method: 'PUT', body: input });
  },
};
