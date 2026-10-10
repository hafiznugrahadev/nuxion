'use client';

import { GuestGuard } from '@/components/auth/guest-guard';
import { PasswordField } from '@/components/common/password-field';
import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { REGISTRATION_ENABLED, register } from '@/lib/auth-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type RegisterValues = z.infer<typeof schema>;

export function RegisterForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, setError } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await register(values.name, values.email, values.password);
      toast.success(t('welcomeAboard'));
      router.replace('/admin/dashboard');
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['name', 'email', 'password'],
      );
      const message = (err as { data?: { message?: string } })?.data?.message;
      toast.error(message || t('createAccountError'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <GuestGuard>
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            {t('registerTitle')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t('registerSubtitle')}</p>
        </div>

        {/* Registration disabled */}
        {!REGISTRATION_ENABLED ? (
          <div className="space-y-3 rounded-lg bg-surface-container p-5 text-sm">
            <p className="text-foreground">{t('registrationDisabled')}</p>
            <Link href="/login" className="inline-block font-medium text-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onSubmit}>
            <TextField
              name="name"
              control={control}
              label={t('fullName')}
              placeholder="Full name"
              required
            />
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
              placeholder="••••••••"
              autocomplete="new-password"
              required
            />
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t('creatingAccount') : t('createAccount')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('haveAccount')}{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </GuestGuard>
  );
}
