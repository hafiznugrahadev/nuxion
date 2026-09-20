/**
 * App branding persisted in the API's settings table (key 'branding') and
 * applied globally by the web app — public (readable pre-auth by the SSR).
 */
export interface BrandingSettings {
  /** Display name used in titles, the sidebar, the auth panel, error pages. */
  appName: string;
  /** Uploaded logo URL (storage module); null falls back to the bundled mark. */
  logoUrl: string | null;
  /** Uploaded favicon URL; null falls back to the bundled /favicon.png. */
  faviconUrl: string | null;
}
