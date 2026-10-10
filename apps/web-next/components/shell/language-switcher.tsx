'use client';

import { Check, Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { setLocale } from '@/i18n/locale-action';
import { type Locale } from '@/i18n/config';

const AVAILABLE: Array<{ code: Locale; name: string }> = [
  { code: 'en', name: 'English' },
  { code: 'id', name: 'Bahasa Indonesia' },
];

/*
 * No-prefix locale switching, matching the Nuxt variant's strategy: a server
 * action writes the `i18n_locale` cookie and refreshes the server tree. URLs
 * never change shape.
 */
export function LanguageSwitcher() {
  const t = useTranslations();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  function choose(code: Locale) {
    setOpen(false);
    startTransition(() => {
      void setLocale(code);
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        data-testid="language-switcher"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={pending}
        className="touch-target relative inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground disabled:opacity-50"
        aria-label={t('language')}
        onClick={() => setOpen((value) => !value)}
      >
        <Languages size={18} aria-hidden="true" />
        <span>{locale.toUpperCase()}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={t('language')}
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] overflow-hidden rounded-md bg-surface-container-high p-1.5 shadow-theme-md"
          >
            {AVAILABLE.map((item) => (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={item.code === locale}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm text-foreground transition-colors hover:bg-on-surface-variant/10"
                onClick={() => choose(item.code)}
              >
                {item.name}
                {item.code === locale && (
                  <Check size={18} className="text-primary" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
