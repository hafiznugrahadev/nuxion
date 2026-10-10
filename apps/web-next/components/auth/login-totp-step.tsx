'use client';

import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { verifyTwoFactor } from '@/lib/auth-api';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

/**
 * Second login step: consume a 2FA challenge with a 6-digit TOTP code or a
 * XXXXX-XXXXX recovery code (port of the Nuxt variant's LoginTotpStep — its
 * own form context, which is why it is a separate component).
 */
export function LoginTotpStep({
  challengeId,
  onVerified,
  onBack,
}: {
  challengeId: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const t = useTranslations('auth');
  const [submitting, setSubmitting] = useState(false);
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);

  const schema = z.object({
    code: z.string().min(6, 'Code must be at least 6 characters').max(11),
  });
  const { control, handleSubmit, setError } = useForm<{ code: string }>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await verifyTwoFactor(challengeId, values.code.trim());
      onVerified();
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['code'],
      );
      toast.error(t('twoFactor.invalidCode'));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {t('twoFactor.title')}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {useRecoveryCode ? t('twoFactor.recoverySubtitle') : t('twoFactor.subtitle')}
        </p>
      </div>

      <form className="space-y-5" onSubmit={onSubmit}>
        <TextField
          name="code"
          control={control}
          label={useRecoveryCode ? t('twoFactor.recoveryCode') : t('twoFactor.code')}
          placeholder={useRecoveryCode ? 'XXXXX-XXXXX' : '123456'}
          inputmode={useRecoveryCode ? 'text' : 'numeric'}
          maxLength={useRecoveryCode ? 11 : 6}
          autocomplete="one-time-code"
          required
        />

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? t('signingIn') : t('signIn')}
        </Button>
      </form>

      <div className="mt-4 space-y-2 text-center text-sm">
        <button
          type="button"
          className="font-medium text-primary hover:underline"
          onClick={() => setUseRecoveryCode((value) => !value)}
        >
          {useRecoveryCode ? t('twoFactor.useTotp') : t('twoFactor.useRecovery')}
        </button>
        <div>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground hover:underline"
            onClick={onBack}
          >
            {t('twoFactor.back')}
          </button>
        </div>
      </div>
    </div>
  );
}
