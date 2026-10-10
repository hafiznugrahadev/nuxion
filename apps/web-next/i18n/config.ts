// Shared locale constants — safe to import from client components (unlike
// i18n/request.ts, which pulls in next/headers).
export const LOCALES = ['en', 'id'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE = 'i18n_locale';
