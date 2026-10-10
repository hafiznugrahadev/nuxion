'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { LOCALE_COOKIE, type Locale } from './config';

/*
 * Locale switching as a server action (the next-intl no-routing pattern):
 * the cookie is server state, so it is written server-side, and
 * revalidatePath refreshes the server tree — the <html lang>, messages and
 * every server component re-render in the new locale without a navigation.
 */
export async function setLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  revalidatePath('/', 'layout');
}
