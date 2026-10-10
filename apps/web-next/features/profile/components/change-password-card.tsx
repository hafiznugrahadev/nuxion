'use client';

import { PasswordField } from '@/components/common/password-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { useConfirm } from '@/lib/use-confirm';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useChangePassword } from '../hooks';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Change-password card — password-confirmed via the destructive confirm. */
export function ChangePasswordCard() {
  const t = useTranslations('profile.changePassword');
  const change = useChangePassword();
  const { confirm } = useConfirm();
  const [confirming, setConfirming] = useState(false);
  const pending = confirming || change.isPending;

  const { control, handleSubmit, reset, setError } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (pending) return;
    setConfirming(true);
    try {
      const ok = await confirm({
        title: t('confirmTitle'),
        description: t('confirmDescription'),
        confirmText: t('update'),
        destructive: true,
      });
      if (!ok) return;
      await change.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      reset();
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['currentPassword', 'newPassword', 'confirmPassword'],
      );
    } finally {
      setConfirming(false);
    }
  });

  return (
    <div className="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <div className="mb-1">
        <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <form className="mt-5 space-y-5" onSubmit={onSubmit}>
        <div className="max-w-md">
          <PasswordField
            name="currentPassword"
            control={control}
            label={t('currentPassword')}
            placeholder="••••••••"
            autocomplete="current-password"
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <PasswordField
            name="newPassword"
            control={control}
            label={t('newPassword')}
            placeholder="••••••••"
            autocomplete="new-password"
          />
          <PasswordField
            name="confirmPassword"
            control={control}
            label={t('confirmPassword')}
            placeholder="••••••••"
            autocomplete="new-password"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? t('updating') : t('update')}
          </Button>
        </div>
      </form>
    </div>
  );
}
