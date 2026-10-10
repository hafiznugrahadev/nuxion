import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/*
 * cacheComponents/partialPrefetching (create-next-app defaults) are off: the
 * locale is cookie-based (i18n/request.ts), so every render reads cookies()
 * and the app stays server-rendered per request — parity with the Nuxt
 * variant, which SSRs the public pages too.
 *
 * The /api + /uploads same-origin proxy lives in route handlers
 * (app/api/[...path], app/uploads/[...path]) reading
 * NEXT_API_INTERNAL_BASE at RUNTIME. Next rewrites were considered and
 * rejected: next.config is evaluated at `next build`, so env-interpolated
 * rewrites bake into routes-manifest.json and can't be changed at container
 * start (the Nuxt variant's compose contract).
 */
const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default createNextIntlPlugin()(nextConfig);
