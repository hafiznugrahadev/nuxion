import { BrandLogo } from '@/components/common/brand-logo';
import { LanguageSwitcher } from '@/components/shell/language-switcher';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { getTranslations } from 'next-intl/server';

/*
 * Stage 0 foundation page. The full landing (hero ambience, terminal, #why
 * section) ports from the Nuxt variant in its own stage; until then this page
 * states plainly what is and isn't here yet, and links only to real
 * destinations.
 */
export default async function Home() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col bg-background text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/40 bg-surface/90 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <span className="flex shrink-0 items-center gap-3">
            <BrandLogo className="h-8" />
            <span className="text-base font-semibold tracking-tight text-on-surface">
              {t('app.name')}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="grid flex-1 place-items-center px-4 pt-16">
        <div className="flex max-w-md flex-col items-center text-center">
          <BrandLogo className="h-12" />
          <h1 className="mt-6 text-3xl font-bold tracking-tight">{t('app.name')}</h1>
          <p className="mt-3 text-base leading-relaxed text-on-surface-variant">
            {t('landing.tagline')}
          </p>
          <p
            className="mt-6 rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 font-mono text-xs text-brand-teal-deep dark:text-brand-mint"
            data-testid="landing-status"
          >
            {t('landing.status')}
          </p>
          <a
            href="https://github.com/hafiznugrahadev/nuxion"
            className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
          >
            {t('landing.source')}
          </a>
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
