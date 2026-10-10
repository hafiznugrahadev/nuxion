'use client';

import { LoadingState } from '@/components/blocks/states';
import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { ensureSession, logout, TWO_FACTOR_ENABLED } from '@/lib/auth-api';
import { getAuthState, isAuthenticated, setSession, subscribeAuth } from '@/lib/auth-store';
import { intendedRedirect } from '@/lib/intended-redirect';
import { securityApi, type TwoFactorSetupPayload } from '@/features/security';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your app'),
});

/**
 * Forced TOTP setup (port of the Nuxt variant's two-factor/setup page). When
 * the 2FA flag is on, the admin guard keeps every un-activated user here —
 * it's the one exempt route. The escape hatch is signing out; activation
 * itself is the only way forward. Recovery codes are shown exactly once.
 */
export function TwoFactorSetup() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  useSyncExternalStore(subscribeAuth, getAuthState, getAuthState);

  const [setupData, setSetupData] = useState<TwoFactorSetupPayload | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void ensureSession().then(async () => {
      if (cancelled) return;
      // Unauthenticated (or 2FA globally off): nothing to set up here.
      if (!isAuthenticated(getAuthState()) || !TWO_FACTOR_ENABLED) {
        router.replace('/login');
        return;
      }
      // Already activated (e.g. this URL was revisited) — nothing to do here.
      if (getAuthState().user?.twoFactorEnabled) {
        router.replace(intendedRedirect(searchParams));
        return;
      }
      try {
        const data = await securityApi.twoFactorSetup();
        if (!cancelled) setSetupData(data);
      } catch (err) {
        if (!cancelled) setLoadError((err as Error)?.message || 'Could not start setup');
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const { control, handleSubmit, setError } = useForm<{ code: string }>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!setupData) return;
    setActivating(true);
    try {
      const result = await securityApi.twoFactorActivate(values.code);
      setRecoveryCodes(result.recoveryCodes);
      // Mirror the activation into the in-memory session (guards re-read it).
      const state = getAuthState();
      if (state.user) {
        setSession({
          accessToken: state.accessToken!,
          user: { ...state.user, twoFactorEnabled: true },
        });
      }
      toast.success(t('auth.twoFactor.activated'));
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['code'],
      );
      toast.error((err as Error)?.message || t('auth.twoFactor.invalidCode'));
    } finally {
      setActivating(false);
    }
  });

  async function copyCodes() {
    if (!recoveryCodes) return;
    await navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success(t('security.recovery.copied'));
  }

  async function signOut() {
    setSigningOut(true);
    await logout();
    router.replace('/login');
  }

  // Activated: recovery codes, shown exactly once.
  if (recoveryCodes) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t('auth.twoFactor.activatedTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('security.recovery.showOnce')}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-4 font-mono text-sm text-foreground">
          {recoveryCodes.map((code) => (
            <span key={code} className="select-none" data-testid="recovery-code">
              {code}
            </span>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Button variant="outline" size="lg" onClick={() => void copyCodes()}>
            {t('security.recovery.copy')}
          </Button>
          <Button
            size="lg"
            data-testid="finish-setup-button"
            onClick={() => router.replace(intendedRedirect(searchParams))}
          >
            {t('auth.twoFactor.continue')}
          </Button>
        </div>
      </div>
    );
  }

  // Setup: QR + code confirmation.
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t('auth.twoFactor.setupTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('auth.twoFactor.setupSubtitle')}</p>
      </div>

      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <div className="space-y-4">
          <p className="text-sm text-destructive">{loadError}</p>
          <Button variant="outline" onClick={() => void signOut()}>
            {t('auth.twoFactor.signOut')}
          </Button>
        </div>
      ) : setupData ? (
        <div className="space-y-6">
          <ol className="space-y-1 text-sm text-muted-foreground">
            <li>1. {t('auth.twoFactor.stepScan')}</li>
            <li>2. {t('auth.twoFactor.stepEnter')}</li>
          </ol>

          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- data-URL QR generated by the API */}
            <img
              src={setupData.qrDataUrl}
              alt={t('auth.twoFactor.qrAlt')}
              className="h-44 w-44 rounded-lg border border-outline-variant bg-white p-2"
              data-testid="totp-qr"
            />
            <p className="text-xs text-muted-foreground">
              {t('auth.twoFactor.manualSecret')}{' '}
              <span className="select-all font-mono text-foreground" data-testid="totp-secret">
                {setupData.secret}
              </span>
            </p>
          </div>

          <form className="space-y-5" onSubmit={onSubmit}>
            <TextField
              name="code"
              control={control}
              label={t('auth.twoFactor.code')}
              placeholder="123456"
              inputmode="numeric"
              maxLength={6}
              autocomplete="one-time-code"
              required
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={activating}
              data-testid="activate-2fa-button"
            >
              {activating ? t('common.working') : t('auth.twoFactor.activate')}
            </Button>
          </form>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground hover:underline"
          disabled={signingOut}
          onClick={() => void signOut()}
        >
          {t('auth.twoFactor.signOut')}
        </button>
      </p>
    </div>
  );
}
