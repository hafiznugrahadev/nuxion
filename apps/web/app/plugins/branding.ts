import type { ApiResponse, BrandingSettings } from '@nuxion/shared-types';
import { useBranding } from '~/composables/useBranding';

/**
 * Seed the global branding state before the app renders — on the SERVER too,
 * so SSR pages (landing, auth, error) carry the stored name/logo/favicon from
 * the first paint. useAsyncData deduplicates and ships the result in the
 * payload, so the client never refetches on hydration.
 *
 * Bare $fetch (not useApi): this is a public pre-auth read and must not go
 * through the Bearer/401-retry machinery.
 */
export default defineNuxtPlugin(async () => {
  const branding = useBranding();
  const config = useRuntimeConfig();

  // Server-side: use the internal base when provided — node/undici rejects the
  // dev stack's self-signed https CA that the browser happily trusts.
  const baseURL = import.meta.server
    ? (config.apiInternalBase as string) || (config.public.apiBase as string)
    : (config.public.apiBase as string);

  const { data } = await useAsyncData('branding', async () => {
    const res = await $fetch<ApiResponse<BrandingSettings>>('/settings/branding', { baseURL });
    return res.success ? res.data : null;
  });
  if (data.value) branding.value = data.value;
});
