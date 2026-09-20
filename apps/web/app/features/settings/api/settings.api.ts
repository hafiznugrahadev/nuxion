import type { ApiResponse, BrandingSettings } from '@nuxion/shared-types';
import { unwrap } from '~/lib/api-client';
import { useApi } from '~/composables/useApi';

export interface UpdateBrandingInput {
  appName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

/**
 * Settings fetchers (SUPER_ADMIN-writable groups). Reads could also use the
 * public endpoint, but going through useApi keeps the shared client (Bearer +
 * transparent refresh) and the vue-query cache in one place.
 */
export function useSettingsApi() {
  const api = useApi();

  return {
    getBranding(): Promise<BrandingSettings> {
      return api<ApiResponse<BrandingSettings>>('/settings/branding').then(unwrap);
    },

    updateBranding(input: UpdateBrandingInput): Promise<BrandingSettings> {
      return api<ApiResponse<BrandingSettings>>('/settings/branding', {
        method: 'PUT',
        body: input,
      }).then(unwrap);
    },
  };
}
