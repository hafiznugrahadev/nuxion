'use client';

import { useApiMutation } from '@/lib/use-api-mutation';
import { getBranding, setBranding } from '@/lib/branding';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { BrandingSettings } from '@nuxion/shared-types';
import { settingsApi, type UpdateBrandingInput } from './api';

const BRANDING_KEY = ['settings', 'branding'];

/** The branding settings group for the Settings page. */
export function useBrandingSettings() {
  return useQuery({
    queryKey: BRANDING_KEY,
    queryFn: () => settingsApi.getBranding(),
    // Seed from the globally-seeded state so the form paints instantly.
    initialData: () => getBranding(),
  });
}

/** Persist branding and rebrand the whole UI instantly (global state sync). */
export function useUpdateBranding() {
  const t = useTranslations('settings.branding');
  const queryClient = useQueryClient();
  return useApiMutation((input: UpdateBrandingInput) => settingsApi.updateBranding(input), {
    successMessage: t('saved'),
    onSuccess(updated: BrandingSettings) {
      queryClient.setQueryData(BRANDING_KEY, updated);
      setBranding(updated);
    },
  });
}
