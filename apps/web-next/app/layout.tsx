import { getBranding } from '@/lib/branding-server';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { FaviconLinks } from '@/components/common/favicon-links';
import { Providers } from './providers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  // SSR branding (the Nuxt variant's branding plugin parity): the default
  // tab title carries the live app name, falling back to the i18n default.
  const branding = await getBranding();
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? 'http://localhost:8080',
    ),
    title: {
      default: branding.appName || t('name'),
      // Every page title already ends with the app name (see the landing's
      // metaTitle), so no template suffix — same rule as the Nuxt variant.
      template: '%s',
    },
    description: t('description'),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f1f1' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1b1b' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const branding = await getBranding();

  return (
    // suppressHydrationWarning: next-themes writes data-theme pre-paint.
    // data-astryx-theme scopes the Astryx token layer (CSS @scope) to the
    // whole document from the first SSR paint — covers <body> and portals
    // before the <Theme> wrapper mounts, which re-syncs the same value.
    // Keep in sync with defaultThemeSlug in astryx-themes.ts (generated).
    <html lang={locale} data-astryx-theme="neutral" suppressHydrationWarning>
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
        {/*
         * The Astryx theme ships its own font (Figtree via
         * theme-neutral/fonts.css, imported by astryx-themes.ts) — no
         * Google Sans/Poppins <link>s in this variant.
         */}
        {}
        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <NextIntlClientProvider messages={messages}>
          <Providers initialBranding={branding}>
            <FaviconLinks />
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
