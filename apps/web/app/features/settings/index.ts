// Public API barrel for the `settings` feature (SPEC: features/ imported explicitly).
export { useSettingsApi } from './api/settings.api';
export type { UpdateBrandingInput } from './api/settings.api';
export { useBrandingSettings, useUpdateBranding } from './composables/useSettings';
export { default as BrandingTab } from './components/BrandingTab.vue';
