import type { BrandingSettings } from '@nuxion/shared-types';
import { apiFetch } from '@/lib/use-api';

export interface UpdateBrandingInput {
  appName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

/**
 * Settings fetchers (SUPER_ADMIN-writable groups). Reads could also use the
 * public endpoint, but the shared client keeps cookie credentials and errors consistent.
 */
export const settingsApi = {
  getBranding(): Promise<BrandingSettings> {
    return apiFetch<BrandingSettings>('/settings/branding');
  },
  updateBranding(input: UpdateBrandingInput): Promise<BrandingSettings> {
    return apiFetch<BrandingSettings>('/settings/branding', { method: 'PUT', body: input });
  },
};
