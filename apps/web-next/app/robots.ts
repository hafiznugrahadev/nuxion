import type { MetadataRoute } from 'next';

/**
 * robots parity with the Nuxt variant's @nuxtjs/seo setup: /admin is a
 * client-side island behind auth — keep crawlers out (the sitemap reads this
 * too, filtering those URLs).
 */
export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? 'http://localhost:8080';
  return {
    rules: { userAgent: '*', disallow: '/admin' },
    sitemap: `${base}/sitemap.xml`,
  };
}
