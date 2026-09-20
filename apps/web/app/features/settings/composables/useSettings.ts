import { useQuery, useQueryClient } from '@tanstack/vue-query';
import type { BrandingSettings } from '@nuxion/shared-types';
import { useI18n } from '#imports';
import { useApiMutation } from '~/composables/useApiMutation';
import { useBranding } from '~/composables/useBranding';
import { useSettingsApi } from '../api/settings.api';

const BRANDING_KEY = ['settings', 'branding'] as const;

/** The branding settings group for the Settings page. */
export function useBrandingSettings() {
  const settingsApi = useSettingsApi();
  const branding = useBranding();

  return useQuery({
    queryKey: BRANDING_KEY,
    queryFn: () => settingsApi.getBranding(),
    // Seed from the globally-seeded state so the form paints instantly.
    initialData: () => branding.value,
  });
}

/** Persist branding and rebrand the whole UI instantly (global state sync). */
export function useUpdateBranding() {
  const { t } = useI18n();
  const settingsApi = useSettingsApi();
  const queryClient = useQueryClient();
  const branding = useBranding();

  return useApiMutation(settingsApi.updateBranding, {
    successMessage: t('settings.branding.saved'),
    onSuccess(updated: BrandingSettings) {
      queryClient.setQueryData(BRANDING_KEY, updated);
      branding.value = updated;
    },
  });
}
