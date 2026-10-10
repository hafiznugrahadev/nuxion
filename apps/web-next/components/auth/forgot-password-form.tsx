'use client';

import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { forgotPassword } from '@/lib/auth-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type ForgotValues = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const { control, handleSubmit, setError } = useForm<ForgotValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await forgotPassword(values.email);
      setSent(true);
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['email'],
      );
      toast.error(t('somethingWrong'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t('forgotTitle')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('forgotSubtitle')}</p>
      </div>

      {/* Success state */}
      {sent ? (
        <div className="space-y-4 rounded-lg bg-surface-container p-5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <MailCheck size={20} aria-hidden="true" />
          </span>
          <p className="text-sm text-foreground">{t('resetLinkSent')}</p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            {t('backToSignIn')}
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={onSubmit}>
          <TextField
            name="email"
            control={control}
            label={t('email')}
            type="email"
            placeholder="name@example.com"
            required
          />
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? t('sending') : t('sendResetLink')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('rememberedIt')}{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              {t('signIn')}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
