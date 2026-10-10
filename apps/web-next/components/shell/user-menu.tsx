'use client';

import { logout } from '@/lib/auth-api';
import { getAuthState, isAuthenticated, subscribeAuth } from '@/lib/auth-store';
import { LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';

/**
 * Sign-out control reading the live session (renders the login target only
 * when a session exists — the admin shell never shows it otherwise). Kept as
 * a plain labelled button: the Nuxt variant's dropdown duplicates the header
 * controls, which this shell already exposes.
 */
export function UserMenu({ showDetails = false }: { showDetails?: boolean }) {
  const t = useTranslations('nav');
  const router = useRouter();
  const auth = useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);
  const authed = isAuthenticated(auth);

  if (!authed) return null;

  const initials =
    auth.user?.name
      ?.split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '?';

  return (
    <button
      type="button"
      className="touch-target relative flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-on-surface/8 hover:text-foreground"
      onClick={() => void logout().then(() => router.replace('/login'))}
      aria-label={t('signOut')}
      data-testid="logout-button"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-container text-[11px] font-semibold text-on-primary-container">
        {initials}
      </span>
      {showDetails && (
        <span className="min-w-0 flex-col items-start text-left leading-tight">
          <span className="block truncate text-sm font-semibold text-foreground">
            {auth.user?.name}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{auth.user?.email}</span>
        </span>
      )}
      <LogOut size={18} className="shrink-0" aria-hidden="true" />
    </button>
  );
}
