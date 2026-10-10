import { cookies } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE, type Locale } from './config';

/*
 * Cookie-based locale without URL prefixes — the same contract as the Nuxt
 * variant's `no_prefix` strategy: the locale lives in the `i18n_locale`
 * cookie, routes never change shape, and the LanguageSwitcher just writes
 * the cookie and refreshes the server tree.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const requested = store.get(LOCALE_COOKIE)?.value;
  const locale: Locale = (LOCALES as readonly string[]).includes(requested ?? '')
    ? (requested as Locale)
    : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
