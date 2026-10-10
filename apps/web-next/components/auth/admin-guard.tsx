'use client';

import { BrandLogo } from '@/components/common/brand-logo';
import { BrandName } from '@/components/common/brand-name';
import { Button } from '@/components/ui/button';
import { ensureSession, TWO_FACTOR_ENABLED } from '@/lib/auth-api';
import { getAuthState, hasRole, isAuthenticated, subscribeAuth } from '@/lib/auth-store';
import { logout } from '@/lib/auth-api';
import { Badge } from '@/components/ui/badge';
import { roleLabel } from '@/lib/roles';
import { UserRole } from '@nuxion/shared-types';
import { House, LayoutDashboard, LogOut, PersonStanding, ShieldCheck } from 'lucide-react';
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
/** Routes whose Nuxt counterparts carry the `admin` middleware. */
const ADMIN_ONLY_ROUTES = ['/admin/users', '/admin/roles', '/admin/settings'];

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
      } else if (TWO_FACTOR_ENABLED && state.user && !state.user.twoFactorEnabled) {
        // The "hook": every admin route keeps un-activated users on the setup
        // page (the one exempt route) until an authenticator is registered.
        // Ordered BEFORE the role check — the Nuxt variant's auth middleware
        // (funnel) runs ahead of the admin middleware (403), so a pending
        // account of any role is funnelled first.
        setStatus('denied');
        router.replace(
          `/two-factor/setup?redirect=${encodeURIComponent(window.location.pathname)}`,
        );
      } else if (
        ADMIN_ONLY_ROUTES.some((route) => window.location.pathname.startsWith(route)) &&
        !hasRole(state, UserRole.ADMIN) &&
        !hasRole(state, UserRole.SUPER_ADMIN)
      ) {
        // Role gate mirrors the Nuxt per-page middleware: users/roles/settings
        // are ['auth','admin']; dashboard/profile/demo are ['auth'] only —
        // any signed-in account may see its own dashboard.
        setStatus('forbidden');
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
    // The Nuxt variant's error.vue forbidden screen: the session card answers
    // "who am I signed in as" (the question a 403 raises), the primary CTA
    // returns to the visitor's own dashboard, and the chips offer the profile
    // and home.
    const user = getAuthState().user;
    const initials =
      user?.name
        ?.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') ?? '?';
    const primaryRole = user?.roles?.[0] ?? 'USER';
    const year = new Date().getFullYear();

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

            {/* Session card: the account that just got denied. */}
            {user && (
              <div
                className="mt-6 flex w-full max-w-xl items-center justify-between gap-3 rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-3 shadow-sm"
                data-testid="error-session-card"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy/10 text-sm font-bold text-brand-teal-deep dark:bg-brand-mint/15 dark:text-brand-mint">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-on-surface">{user.name}</p>
                    <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                  <Badge variant="muted" className="ml-1 shrink-0 font-mono text-[10px] uppercase">
                    {roleLabel(primaryRole, (key) => t(key))}
                  </Badge>
                </div>
                <button
                  type="button"
                  className="touch-target relative flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
                  data-testid="error-signout"
                  onClick={() => void logout().then(() => router.replace('/login'))}
                >
                  <LogOut size={16} aria-hidden="true" />
                  {t('error.forbidden.signOut')}
                </button>
              </div>
            )}

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-brand-navy text-white hover:bg-brand-blue dark:bg-brand-mint/15 dark:text-brand-mint"
                data-testid="error-cta-primary"
                onClick={() => router.replace('/admin/dashboard')}
              >
                <LayoutDashboard size={20} aria-hidden="true" />
                {t('error.forbidden.backToDashboard')}
              </Button>
              <Button variant="outline" size="lg" asChild data-testid="error-cta-secondary">
                <Link href="/">
                  <House size={20} aria-hidden="true" />
                  {t('error.forbidden.home')}
                </Link>
              </Button>
            </div>

            {/* Navigation help chips. */}
            <div
              className="mt-6 flex w-full flex-wrap items-center justify-center gap-1.5"
              data-testid="error-links"
            >
              <span className="mr-1 text-xs font-medium text-on-surface-variant">
                {t('error.forbidden.helpTitle')}
              </span>
              <Link
                href="/admin/profile"
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
              >
                <PersonStanding
                  size={16}
                  className="text-brand-teal-deep dark:text-brand-mint"
                  aria-hidden="true"
                />
                {t('error.forbidden.profile')}
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/60 bg-surface-container px-3 py-1.5 text-xs font-medium text-on-surface transition-colors hover:border-outline hover:bg-surface-container-high"
              >
                <House
                  size={16}
                  className="text-brand-teal-deep dark:text-brand-mint"
                  aria-hidden="true"
                />
                {t('error.forbidden.home')}
              </Link>
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
              © {year} <BrandName />
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
