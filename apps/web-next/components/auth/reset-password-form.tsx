'use client';

import { PasswordField } from '@/components/common/password-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { resetPassword } from '@/lib/auth-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
type ResetValues = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [submitting, setSubmitting] = useState(false);

  const { control, handleSubmit, setError } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      toast.error(t('invalidToken'));
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, values.newPassword);
      toast.success(t('resetSuccess'));
      router.replace('/login');
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['newPassword', 'confirmPassword'],
      );
      toast.error(t('resetInvalidExpired'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t('resetTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('resetSubtitle')}</p>
      </div>

      {/* Missing token */}
      {!token ? (
        <div className="space-y-3 rounded-lg bg-error-container p-5 text-sm text-on-error-container">
          <p>{t('resetInvalidLink')}</p>
          <Link
            href="/forgot-password"
            className="inline-block font-medium text-primary hover:underline"
          >
            {t('requestNewLink')}
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <PasswordField
            name="newPassword"
            control={control}
            label={t('newPassword')}
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
          <PasswordField
            name="confirmPassword"
            control={control}
            label={t('confirmPassword')}
            placeholder="••••••••"
            autocomplete="new-password"
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t('resetting') : t('resetPassword')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('backToSignIn')}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
