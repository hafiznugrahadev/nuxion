import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Providers } from './providers';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? 'http://localhost:8080',
    ),
    title: {
      default: t('name'),
      template: `%s · ${t('name')}`,
    },
    description: t('description'),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfc' },
    { media: '(prefers-color-scheme: dark)', color: '#1a1a1a' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    // suppressHydrationWarning: next-themes writes data-theme pre-paint.
    <html lang={locale} suppressHydrationWarning>
      <body className="flex min-h-svh flex-col bg-background font-sans text-foreground antialiased">
        {/*
         * Google Sans + Poppins via <link>, matching the Nuxt variant (Google
         * Sans is not in the next/font catalog). React hoists these to <head>.
         */}
        {}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- app-router root layout, not pages/_document */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Google+Sans:wght@300;400;500;600;700;800&family=Poppins:wght@500;600;700;800&display=swap"
        />
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
