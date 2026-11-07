'use client';

import { GuestGuard } from '@/components/auth/guest-guard';
import { LoginTotpStep } from '@/components/auth/login-totp-step';
import { PasswordField } from '@/components/common/password-field';
import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import {
  login,
  passkeyLoginOptions,
  passkeyLoginVerify,
  PASSKEY_ENABLED,
  REGISTRATION_ENABLED,
  type TwoFactorChallenge,
} from '@/lib/auth-api';
import { intendedRedirect } from '@/lib/intended-redirect';
import { startAuthentication } from '@simplewebauthn/browser';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// FE-only Zod schema (BE validates with class-validator). Mirrors LoginDto.
const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type LoginValues = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  // Password OK but TOTP is enabled — swap the form for the code step.
  const [challenge, setChallenge] = useState<TwoFactorChallenge | null>(null);

  const { control, handleSubmit, setError } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  function finishLogin() {
    toast.success(t('welcomeBack'));
    router.replace(intendedRedirect(searchParams));
  }

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      const result = await login(values.email, values.password);
      if ('twoFactorRequired' in result) {
        setChallenge(result);
        return;
      }
      finishLogin();
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['email', 'password'],
      );
      toast.error(t('invalidCredentials'));
    } finally {
      setSubmitting(false);
    }
  });

  // Passkey sign-in (discoverable credential — no username needed).
  const [passkeyBusy, setPasskeyBusy] = useState(false);
  async function signInWithPasskey() {
    setPasskeyBusy(true);
    try {
      const { challengeId, options } = await passkeyLoginOptions();
      const assertion = await startAuthentication({ optionsJSON: options });
      const result = await passkeyLoginVerify(challengeId, assertion);
      if ('twoFactorRequired' in result) {
        // Passkey without user verification — the account still owes a TOTP step.
        setChallenge(result);
        toast.info(t('twoFactor.otpRequired'));
        return;
      }
      finishLogin();
    } catch (err) {
      // A dismissed browser prompt is a user choice, not a failure.
      if ((err as Error)?.name !== 'NotAllowedError') toast.error(t('passkey.failed'));
    } finally {
      setPasskeyBusy(false);
    }
  }

  if (challenge) {
    return (
      <GuestGuard>
        <LoginTotpStep
          key={challenge.challengeId}
          challengeId={challenge.challengeId}
          onVerified={finishLogin}
          onBack={() => setChallenge(null)}
        />
      </GuestGuard>
    );
  }

  return (
    <GuestGuard>
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t('signIn')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('signInSubtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {PASSKEY_ENABLED && (
            <button
              type="button"
              data-testid="passkey-login-button"
              className="inline-flex h-10 items-center justify-center gap-3 rounded-full border border-outline bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-on-surface/8 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={passkeyBusy}
              onClick={() => void signInWithPasskey()}
            >
              <KeyRound size={18} aria-hidden="true" />
              {passkeyBusy ? t('signingIn') : t('passkey.signIn')}
            </button>
          )}
        </div>

        {PASSKEY_ENABLED && (
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-3 text-muted-foreground">{t('or')}</span>
            </div>
          </div>
        )}

        <form className="space-y-5" onSubmit={onSubmit}>
          <TextField
            name="email"
            control={control}
            label={t('email')}
            type="email"
            placeholder="name@example.com"
            required
          />
          <PasswordField
            name="password"
            control={control}
            label={t('password')}
            placeholder="Enter your password"
            autocomplete="current-password"
            required
          />

          {/* Forgot password (the "keep me logged in" checkbox was removed: it
               had no behavior behind it) */}
          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t('signingIn') : t('signIn')}
          </Button>
        </form>

        {REGISTRATION_ENABLED && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              {t('signUp')}
            </Link>
          </p>
        )}

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 rounded-lg bg-surface-container px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Demo credentials:
              <span className="font-medium text-foreground"> admin@nuxion.test</span> /
              <span className="font-medium text-foreground"> admin123</span>
            </p>
          </div>
        )}
      </div>
    </GuestGuard>
  );
}
