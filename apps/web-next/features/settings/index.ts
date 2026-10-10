// Public API barrel for the `settings` feature (features/ imported explicitly).
export { BrandingTab } from './components/branding-tab';
export { useBrandingSettings, useUpdateBranding } from './hooks';
export { settingsApi } from './api';
export type { UpdateBrandingInput } from './api';
