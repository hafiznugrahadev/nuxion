'use client';

import { ErrorState, LoadingState } from '@/components/blocks/states';
import { BrandLogo } from '@/components/common/brand-logo';
import { Field } from '@/components/common/field';
import { TextField } from '@/components/common/text-field';
import { Button } from '@/components/ui/button';
import { apiFieldErrors, applyApiFieldErrors } from '@/lib/api-errors';
import { getAuthState, hasRole, subscribeAuth } from '@/lib/auth-store';
import { uploadFile } from '@/lib/upload';
import { UserRole } from '@nuxion/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoaderCircle, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useBrandingSettings, useUpdateBranding } from '../hooks';

const schema = z.object({
  appName: z.string().min(2, 'Name must be at least 2 characters').max(50),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
});

/**
 * Branding group editor: app name + logo/favicon uploads (avatar-picker
 * pattern — the file uploads immediately, the returned URL sits in the form
 * until Save persists it). Read-only for anyone below Super Admin.
 */
export function BrandingTab() {
  const t = useTranslations('settings.branding');
  const canEdit = useSyncExternalStore(
    subscribeAuth,
    () => hasRole(getAuthState(), UserRole.SUPER_ADMIN),
    () => false,
  );

  const { data, isLoading, isError, error, refetch } = useBrandingSettings();
  const update = useUpdateBranding();

  const { control, handleSubmit, setValue, setError, reset } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      appName: data?.appName ?? '',
      logoUrl: data?.logoUrl ?? null,
      faviconUrl: data?.faviconUrl ?? null,
    },
  });

  // Track server-side edits to the initial values (e.g. another admin saved):
  // re-seed whenever the fetched record's identity changes.
  const identity = data ? `${data.appName}|${data.logoUrl ?? ''}|${data.faviconUrl ?? ''}` : '';
  useEffect(() => {
    if (!data) return;
    reset({
      appName: data.appName,
      logoUrl: data.logoUrl ?? null,
      faviconUrl: data.faviconUrl ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- identity encodes data
  }, [identity, reset]);

  const [submitting, setSubmitting] = useState(false);
  const onSubmit = handleSubmit(async (form) => {
    setSubmitting(true);
    try {
      await update.mutateAsync({
        appName: form.appName.trim(),
        logoUrl: form.logoUrl ?? null,
        faviconUrl: form.faviconUrl ?? null,
      });
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['appName', 'logoUrl', 'faviconUrl'],
      );
    } finally {
      setSubmitting(false);
    }
  });

  // ── Logo / favicon pickers (upload now, persist on Save) ─────────────────────
  const MAX_MB = 5;
  const logoInput = useRef<HTMLInputElement>(null);
  const faviconInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<'logo' | 'favicon' | null>(null);
  const [uploadErrors, setUploadErrors] = useState<
    Partial<Record<'logoUrl' | 'faviconUrl', string>>
  >({});

  const logoValue = useWatch({ control, name: 'logoUrl' });
  const faviconValue = useWatch({ control, name: 'faviconUrl' });

  function pick(kind: 'logo' | 'favicon', event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ''; // allow re-picking the same file
    if (!file) return;
    const field = kind === 'logo' ? 'logoUrl' : 'faviconUrl';
    setUploadErrors((current) => ({ ...current, [field]: undefined }));
    if (!file.type.startsWith('image/')) {
      toast.error(t('notImage'));
      setUploadErrors((current) => ({ ...current, [field]: t('notImage') }));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(t('tooLarge', { mb: MAX_MB }));
      setUploadErrors((current) => ({ ...current, [field]: t('tooLarge', { mb: MAX_MB }) }));
      return;
    }

    setUploading(kind);
    void (async () => {
      try {
        const uploaded = await uploadFile(file, 'branding');
        setValue(field, uploaded.url);
        toast.success(t('uploaded'));
      } catch (err) {
        const message = apiFieldErrors(err).file || (err as Error)?.message || t('uploadFailed');
        setUploadErrors((current) => ({ ...current, [field]: message }));
        toast.error(message);
      } finally {
        setUploading(null);
      }
    })();
  }

  function clearAsset(field: 'logoUrl' | 'faviconUrl') {
    setUploadErrors((current) => ({ ...current, [field]: undefined }));
    setValue(field, null);
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <div className="mb-1">
        <h3 className="text-base font-semibold text-foreground">{t('title')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      {isLoading && !data ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : (
        <form className="mt-5 space-y-6" onSubmit={onSubmit}>
          <div className="max-w-md">
            <TextField
              name="appName"
              control={control}
              label={t('appName')}
              placeholder={data?.appName ?? 'Nuxion'}
              disabled={!canEdit}
            />
          </div>

          {/* Logo picker */}
          <PickerRow
            label={t('uploadLogo')}
            hint={t('logoHint')}
            error={uploadErrors.logoUrl}
            uploading={uploading === 'logo'}
            disabled={!canEdit}
            onPick={() => logoInput.current?.click()}
            onClear={() => clearAsset('logoUrl')}
            clearLabel={t('useDefault')}
            inputRef={logoInput}
            inputId="branding-logo"
            accept="image/*"
            onInputChange={(event) => pick('logo', event)}
            preview={
              logoValue ? (
                // eslint-disable-next-line @next/next/no-img-element -- API-served branding asset
                <img src={logoValue} alt={t('logoAlt')} className="h-10 w-auto" />
              ) : (
                <BrandLogo className="h-10" />
              )
            }
          />

          {/* Favicon picker */}
          <PickerRow
            label={t('uploadFavicon')}
            hint={t('faviconHint')}
            error={uploadErrors.faviconUrl}
            uploading={uploading === 'favicon'}
            disabled={!canEdit}
            onPick={() => faviconInput.current?.click()}
            onClear={() => clearAsset('faviconUrl')}
            clearLabel={t('useDefault')}
            inputRef={faviconInput}
            inputId="branding-favicon"
            accept="image/*"
            onInputChange={(event) => pick('favicon', event)}
            preview={
              faviconValue ? (
                // eslint-disable-next-line @next/next/no-img-element -- API-served branding asset
                <img src={faviconValue} alt={t('faviconAlt')} className="h-8 w-8 rounded-sm" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- bundled favicon
                <img src="/favicon.png" alt={t('faviconAlt')} className="h-8 w-8 rounded-sm" />
              )
            }
          />

          {!canEdit && <p className="text-xs text-muted-foreground">{t('superAdminOnly')}</p>}

          {canEdit && (
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? t('saving') : t('save')}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

/** Upload-now picker row: preview + trigger + hint/error + reset-to-default. */
function PickerRow({
  label,
  hint,
  error,
  uploading,
  disabled,
  onPick,
  onClear,
  clearLabel,
  inputRef,
  inputId,
  accept,
  onInputChange,
  preview,
}: {
  label: string;
  hint: string;
  error?: string;
  uploading: boolean;
  disabled: boolean;
  onPick: () => void;
  onClear: () => void;
  clearLabel: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputId: string;
  accept: string;
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  preview: React.ReactNode;
}) {
  return (
    <Field error={error}>
      {({ describedBy }) => (
        <div className="flex flex-col gap-2" aria-describedby={describedBy}>
          <span className="flex items-center gap-3">
            <span className="flex h-14 w-24 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-1">
              {preview}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled || uploading}
              onClick={onPick}
            >
              {uploading ? (
                <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Upload size={16} aria-hidden="true" />
              )}
              {label}
            </Button>
          </span>
          {!error && <p className="text-xs text-on-surface-variant">{hint}</p>}
          {!disabled && (
            <button
              type="button"
              className="w-fit text-xs font-medium text-primary hover:underline"
              onClick={onClear}
            >
              {clearLabel}
            </button>
          )}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            className="hidden"
            aria-label={label}
            onChange={onInputChange}
          />
        </div>
      )}
    </Field>
  );
}
