'use client';

import { GuestGuard } from '@/components/auth/guest-guard';
import { PasswordField } from '@/components/common/password-field';
import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { login, REGISTRATION_ENABLED, type TwoFactorChallenge } from '@/lib/auth-api';
import { intendedRedirect } from '@/lib/intended-redirect';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

// Social providers are decorative in the starter kit — wire them up to your IdP.
function notImplemented(provider: string) {
  toast.info(`${provider} sign-in is not wired up in this starter kit.`);
}

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
  // Password OK but TOTP is enabled — the verification UI ships with the 2FA
  // stage; until then the user gets an honest notice instead of a dead form.
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

  if (challenge) {
    return (
      <div className="space-y-4 rounded-lg bg-surface-container p-5 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
          <ShieldCheck size={20} aria-hidden="true" />
        </span>
        <p className="text-sm text-foreground">{t('twoFactorRequired')}</p>
        <button
          type="button"
          className="inline-block text-sm font-medium text-primary hover:underline"
          onClick={() => setChallenge(null)}
        >
          {t('backToSignIn')}
        </button>
      </div>
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

        {/* Social sign-in: MD3 outlined buttons, stacked full-width — localized
             labels ("Masuk dengan Google") don't fit two-up in the 384px form. */}
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-3 rounded-full border border-outline bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-on-surface/8"
            onClick={() => notImplemented('Google')}
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M18.7511 10.1944C18.7511 9.47495 18.6915 8.94995 18.5626 8.40552H10.1797V11.6527H15.1003C15.0011 12.4597 14.4654 13.675 13.2749 14.4916L13.2582 14.6003L15.9088 16.6126L16.0925 16.6305C17.7799 15.1041 18.7511 12.8583 18.7511 10.1944Z"
                fill="#4285F4"
              />
              <path
                d="M10.1788 18.75C12.5895 18.75 14.6133 17.9722 16.0915 16.6305L13.274 14.4916C12.5201 15.0068 11.5081 15.3666 10.1788 15.3666C7.81773 15.3666 5.81379 13.8402 5.09944 11.7305L4.99517 11.7392L2.23903 13.8295L2.20312 13.9277C3.67139 16.786 6.69005 18.75 10.1788 18.75Z"
                fill="#34A853"
              />
              <path
                d="M5.10014 11.7305C4.91165 11.186 4.80257 10.6047 4.80257 9.99992C4.80257 9.39416 4.91204 8.81185 5.09022 8.26935L5.08523 8.1534L2.29464 6.02954L2.20383 6.0721C1.60353 7.27366 1.25977 8.59787 1.25977 9.99992C1.25977 11.4029 1.60414 12.7255 2.20383 13.9277L5.10014 11.7305Z"
                fill="#FBBC05"
              />
              <path
                d="M10.1788 4.63331C11.8559 4.63331 12.9874 5.35303 13.6321 5.95442L16.1509 3.49553C14.6022 2.06848 12.5895 1.25 10.1788 1.25C6.69005 1.25 3.67139 3.21443 2.20312 6.07268L5.08953 8.26943C5.81379 6.15972 7.81773 4.63331 10.1788 4.63331Z"
                fill="#EA4335"
              />
            </svg>
            {t('googleSignIn')}
          </button>
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center gap-3 rounded-full border border-outline bg-transparent text-sm font-medium text-foreground transition-colors hover:bg-on-surface/8"
            onClick={() => notImplemented('X')}
          >
            <svg className="h-[18px] w-[18px] fill-current" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            {t('xSignIn')}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">{t('or')}</span>
          </div>
        </div>

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

        <div className="mt-6 rounded-lg bg-surface-container px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            Demo credentials:
            <span className="font-medium text-foreground"> admin@nuxion.test</span> /
            <span className="font-medium text-foreground"> admin123</span>
          </p>
        </div>
      </div>
    </GuestGuard>
  );
}
