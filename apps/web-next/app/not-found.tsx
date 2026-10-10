import { IllustrationCard } from '@/components/error/illustration-card';
import { BrandLogo } from '@/components/common/brand-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { Crosshair, House, Radar, TriangleAlert } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

/*
 * 404 — Stitch "lost in orbit" concept ported from the Nuxt variant's
 * error.vue. The 403 variant (with its session card and help chips) and the
 * 404 destination chips return with the auth/admin stages, once /login and
 * /admin/dashboard are real routes — chips to pages that don't exist yet
 * would be dead links.
 */
export default async function NotFound() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

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
        {/* Ambient brand glows (Stitch ambience, Nuxion palette). */}
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
              image="/images/errors/404-lost-in-orbit.webp"
              imageAlt="Flying robot lost among scattered letters and numbers"
              pingClass="bg-brand-teal"
              badgeIcon={Radar}
              badgeText={t('error.notFound.signal')}
              monoIcon={Crosshair}
              monoTag="0x404_VOID"
            />
          </div>

          <div className="order-1 flex flex-col items-start text-left lg:order-2 lg:col-span-6">
            <Badge variant="info" className="mb-4 gap-1.5 uppercase tracking-wider">
              <TriangleAlert size={16} fill="currentColor" aria-hidden="true" />
              {t('error.notFound.badge')}
            </Badge>

            <h1 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
              {t('error.notFound.title')}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-on-surface-variant sm:text-lg">
              {t('error.notFound.description')}
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Button
                size="lg"
                asChild
                className="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
                data-testid="error-cta-primary"
              >
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
