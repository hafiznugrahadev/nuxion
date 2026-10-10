'use client';

import { Button } from '@/components/ui/button';
import { ensureSession } from '@/lib/auth-api';
import { getAuthState, isAuthenticated, subscribeAuth } from '@/lib/auth-store';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect, useSyncExternalStore } from 'react';

/**
 * Auth-aware sign-in/dashboard CTA (the landing's hero secondary button and
 * nav button, replacing the Nuxt ClientOnly pair). Renders the sign-in
 * variant during SSR and until the client has restored the session from the
 * refresh cookie, then flips to the dashboard link when one exists — same
 * fallback-first contract as the Nuxt version, without hydration mismatch.
 */
export function AuthCta({ variant = 'button' }: { variant?: 'button' | 'hero' }) {
  const t = useTranslations();
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);

  useEffect(() => {
    void ensureSession();
  }, []);

  const authed = isAuthenticated(auth);
  const size = variant === 'hero' ? 'lg' : 'sm';
  const className = variant === 'hero' ? 'active:scale-[0.98]' : 'active:scale-[0.98]';

  return (
    <Button
      variant="secondary"
      size={size}
      asChild
      className={className}
      data-testid={authed ? 'cta-dashboard' : 'cta-login'}
    >
      <Link href={authed ? '/admin/dashboard' : '/login'}>
        {authed ? (
          <>
            <LayoutDashboard size={variant === 'hero' ? 18 : 16} aria-hidden="true" />
            {t('nav.dashboard')}
          </>
        ) : (
          <>
            <LogIn size={variant === 'hero' ? 18 : 16} aria-hidden="true" />
            {t('auth.signIn')}
          </>
        )}
      </Link>
    </Button>
  );
}
