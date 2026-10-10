import type { MetadataRoute } from 'next';

/**
 * Sitemap parity with the Nuxt variant: i18n's no_prefix strategy keeps one
 * URL per route, so the sitemap stays single-locale. Public + auth pages
 * only — /admin is robots-disallowed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? 'http://localhost:8080';
  const now = new Date();
  return ['/', '/login', '/register', '/forgot-password'].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
