'use client';

import { BrandLogo } from '@/components/common/brand-logo';
import { Button } from '@/components/ui/button';
import { ensureSession, TWO_FACTOR_ENABLED } from '@/lib/auth-api';
import { getAuthState, hasRole, isAuthenticated, subscribeAuth } from '@/lib/auth-store';
import { logout } from '@/lib/auth-api';
import { UserRole } from '@nuxion/shared-types';
import { House, LogOut, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

/**
 * Guard for the admin area — the port of the Nuxt auth + admin middleware.
 * The token lives in memory, so the check is client-side: restore the session
 * first (single-flight), then send unauthenticated visitors to /login with a
 * redirect back, and render the dedicated 403 screen for authenticated
 * non-admins (mirroring the Nuxt admin middleware's fatal 403).
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const t = useTranslations();
  // Subscribe so a logout mid-session re-runs the guard's decision.
  useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
  const [status, setStatus] = useState<'checking' | 'denied' | 'forbidden' | 'ok'>('checking');

  useEffect(() => {
    let cancelled = false;
    void ensureSession().then(() => {
      if (cancelled) return;
      const state = getAuthState();
      if (!isAuthenticated(state)) {
        setStatus('denied');
        router.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      } else if (!hasRole(state, UserRole.ADMIN) && !hasRole(state, UserRole.SUPER_ADMIN)) {
        setStatus('forbidden');
      } else if (TWO_FACTOR_ENABLED && state.user && !state.user.twoFactorEnabled) {
        // The "hook": every admin route keeps un-activated users on the setup
        // page (the one exempt route) until an authenticator is registered.
        setStatus('denied');
        router.replace(
          `/two-factor/setup?redirect=${encodeURIComponent(window.location.pathname)}`,
        );
      } else {
        setStatus('ok');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === 'ok') return <>{children}</>;

  if (status === 'forbidden') {
    return (
      <div
        className="flex min-h-svh flex-col bg-background text-on-surface"
        data-testid="admin-forbidden"
      >
        <main className="grid flex-1 place-items-center px-4 py-16">
          <div className="flex max-w-md flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- bundled Stitch illustration */}
            <img
              src="/images/errors/403-access-denied.webp"
              alt="Security robot guarding an access-denied shield"
              className="h-52 w-52 select-none object-contain"
              draggable={false}
            />
            <h1 className="mt-6 text-2xl font-bold tracking-tight">{t('error.forbidden.title')}</h1>
            <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
              {t('error.forbidden.description')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                className="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
                asChild
              >
                <Link href="/">
                  <House size={20} aria-hidden="true" />
                  {t('error.backHome')}
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => void logout().then(() => router.replace('/login'))}
              >
                <LogOut size={18} aria-hidden="true" />
                {t('error.forbidden.signOut')}
              </Button>
            </div>
            <p className="mt-8 flex items-center gap-1.5 text-xs text-on-surface-variant">
              <ShieldCheck size={14} aria-hidden="true" />
              {t('error.forbidden.protocol')}
            </p>
          </div>
        </main>
        <footer className="border-t border-outline-variant/40 py-4">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4">
            <BrandLogo className="h-5" />
            <p className="text-xs text-on-surface-variant">
              © {new Date().getFullYear()} {t('app.name')}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Checking (or about to redirect to login): quiet placeholder, no flash of
  // content the visitor may never be allowed to see.
  return <div className="grid min-h-svh place-items-center" aria-busy="true" />;
}
