'use client';

import { IllustrationCard } from '@/components/error/illustration-card';
import { BrandLogo } from '@/components/common/brand-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import {
  Check,
  Copy,
  Crosshair,
  HeartPulse,
  House,
  RefreshCw,
  Terminal,
  TriangleAlert,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';

/*
 * 500 / generic error boundary — Stitch "server trouble" concept ported from
 * the Nuxt variant's error.vue. The root layout still wraps this boundary,
 * but the failing page's chrome is gone, so the public bar is inlined here
 * (the same reason error.vue inlines it in the Nuxt variant).
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  // Client-time only exists after hydration; this boundary renders on the
  // client, so a lazy initializer is safe (SSR keeps the em dash placeholder).
  const [occurredAt] = useState(() =>
    typeof window === 'undefined' ? '—' : new Date().toLocaleTimeString(),
  );
  const [copied, setCopied] = useState(false);
  const year = new Date().getFullYear();

  async function copyDetails() {
    const lines = [
      `${t('app.name')} error report`,
      'Status: 500',
      `Page: ${window.location.pathname}`,
      `Time: ${occurredAt}`,
    ];
    if (error?.digest) lines.push(`Digest: ${error.digest}`);
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/iframe) — the telemetry stays
      // on-screen, nothing else to do.
    }
  }

  // Dev builds keep the digest on-screen for debugging; the gate strips the
  // block from production reasoning entirely.
  const devDigest = process.env.NODE_ENV !== 'production' ? (error?.digest ?? null) : null;

  return (
    <div className="flex min-h-svh flex-col bg-background text-on-surface" data-testid="error-page">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <BrandLogo className="h-8" />
            <span className="text-base font-semibold tracking-tight text-on-surface">
              {t('app.name')}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden pt-16">
        <div
          className="pointer-events-none absolute -left-24 top-1/4 -z-10 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-mint/10"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-16 bottom-8 -z-10 h-80 w-80 rounded-full bg-brand-teal/10 blur-3xl dark:bg-brand-teal/15"
          aria-hidden="true"
        />

        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="order-2 lg:order-1 lg:col-span-6">
            <IllustrationCard
              image="/images/errors/500-server-trouble.webp"
              imageAlt="Technician robot repairing an overheated server rack"
              pingClass="bg-rose-500"
              badgeIcon={HeartPulse}
              badgeText={t('error.serverError.diagnostics')}
              monoIcon={Crosshair}
              monoTag="#SRV-500-ENG"
            />
          </div>

          <div className="order-1 flex flex-col items-start text-left lg:order-2 lg:col-span-6">
            <Badge variant="destructive" className="mb-4 gap-1.5 uppercase tracking-wider">
              <TriangleAlert size={16} fill="currentColor" aria-hidden="true" />
              {t('error.serverError.badge')}
            </Badge>

            <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              {t('error.serverError.title')}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {t('error.serverError.description')}
            </p>

            {/* Telemetry card with real request data. */}
            <div
              className="mt-6 w-full max-w-xl rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 shadow-sm"
              data-testid="error-telemetry"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                  <Terminal
                    size={18}
                    className="text-brand-teal-deep dark:text-brand-mint"
                    aria-hidden="true"
                  />
                  {t('error.serverError.telemetry')}
                </span>
                <button
                  type="button"
                  className="touch-target relative flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-teal-deep transition-colors hover:bg-surface-container dark:text-brand-mint"
                  data-testid="error-copy-details"
                  onClick={copyDetails}
                >
                  {copied ? (
                    <Check size={16} aria-hidden="true" />
                  ) : (
                    <Copy size={16} aria-hidden="true" />
                  )}
                  {copied ? t('error.serverError.copied') : t('error.serverError.copyDetails')}
                </button>
              </div>
              <dl className="grid grid-cols-1 gap-3 rounded-lg bg-surface-container-lowest/80 p-3 text-left sm:grid-cols-3">
                <div className="flex flex-col">
                  <dt className="text-xs text-on-surface-variant">
                    {t('error.serverError.statusCode')}
                  </dt>
                  <dd className="font-mono text-sm font-semibold text-on-surface">500</dd>
                </div>
                <div className="flex min-w-0 flex-col">
                  <dt className="text-xs text-on-surface-variant">{t('error.serverError.path')}</dt>
                  <dd
                    className="truncate font-mono text-sm font-semibold text-on-surface"
                    data-testid="error-path"
                  >
                    {typeof window !== 'undefined' ? window.location.pathname : '—'}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-on-surface-variant">{t('error.serverError.time')}</dt>
                  <dd className="font-mono text-sm font-semibold text-on-surface">{occurredAt}</dd>
                </div>
              </dl>
            </div>

            {devDigest && (
              <div
                className="mt-6 w-full max-w-xl rounded-xl border border-outline-variant/50 bg-surface-container-low p-4 shadow-sm"
                data-testid="error-dev-details"
              >
                <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-on-surface">
                  <Terminal
                    size={18}
                    className="text-brand-teal-deep dark:text-brand-mint"
                    aria-hidden="true"
                  />
                  {t('error.devDetails')}
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg bg-surface-container-lowest/80 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-on-surface">
                  {devDigest}
                </pre>
              </div>
            )}

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
                data-testid="error-cta-primary"
                /*
                 * reset() retries rendering the failed segment — the
                 * Next-native equivalent of the Nuxt variant's full page
                 * reload, without losing client state elsewhere.
                 */
                onClick={reset}
              >
                <RefreshCw size={20} aria-hidden="true" />
                {t('error.serverError.reload')}
              </Button>
              <Button variant="secondary" size="lg" asChild data-testid="error-cta-secondary">
                <Link href="/">
                  <House size={20} aria-hidden="true" />
                  {t('error.backHome')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-outline-variant/40 py-4">
        <p className="mx-auto max-w-7xl px-4 text-center text-xs text-on-surface-variant sm:px-6">
          © {year} {t('app.name')}
        </p>
      </footer>
    </div>
  );
}
