'use client';

import { EmptyState, ErrorState, LoadingState } from '@/components/blocks/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Field } from '@/components/common/field';
import { PasswordField } from '@/components/common/password-field';
import { apiFieldErrors, applyApiFieldErrors } from '@/lib/api-errors';
import { PASSKEY_ENABLED, TWO_FACTOR_ENABLED } from '@/lib/auth-api';
import { getAuthState } from '@/lib/auth-store';
import { useConfirm } from '@/lib/use-confirm';
import { startRegistration } from '@simplewebauthn/browser';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { securityApi } from '../api';
import type { Passkey } from '../types';

const PASSKEYS_KEY = ['passkeys'];

/**
 * Account security: TOTP status + recovery-code regeneration, and (when the
 * passkey flag is on) registered passkeys. The forced TOTP *setup* itself
 * lives on /two-factor/setup — this card only manages an already-active
 * account. Port of the Nuxt variant's SecuritySection.
 */
export function SecuritySection() {
  const t = useTranslations();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm } = useConfirm();

  const twoFactorActive = getAuthState().user?.twoFactorEnabled === true;

  const {
    data: passkeys,
    isLoading: passkeysLoading,
    isError: passkeysError,
    error: passkeysErr,
    refetch: refetchPasskeys,
  } = useQuery<Passkey[]>({
    queryKey: PASSKEYS_KEY,
    queryFn: () => securityApi.listPasskeys(),
    enabled: PASSKEY_ENABLED,
  });

  // ── Recovery codes regeneration (password-confirmed) ────────────────────────
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenCodes, setRegenCodes] = useState<string[] | null>(null);
  const [regenSubmitting, setRegenSubmitting] = useState(false);

  const regenSchema = z.object({
    password: z.string().min(6, 'Password must be at least 6 characters'),
  });
  const regenForm = useForm<z.infer<typeof regenSchema>>({
    resolver: zodResolver(regenSchema),
    defaultValues: { password: '' },
  });

  function closeRegen() {
    setRegenOpen(false);
    // Codes stay on screen while the modal is open, then are forgotten forever.
    setRegenCodes(null);
  }

  const onRegenSubmit = regenForm.handleSubmit(async (values) => {
    if (regenSubmitting) return;
    setRegenSubmitting(true);
    try {
      const ok = await confirm({
        title: t('security.recovery.title'),
        description: t('security.recovery.confirmDescription'),
        confirmText: t('security.recovery.regenerate'),
        destructive: true,
      });
      if (!ok || !regenOpen) return;
      const codes = await securityApi.regenerateRecoveryCodes(values.password);
      setRegenCodes(codes);
      regenForm.reset();
      toast.success(t('security.recovery.regenerated'));
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            regenForm.setError(field as never, { message });
        },
        ['password'],
      );
      toast.error((err as Error)?.message || t('security.recovery.failed'));
    } finally {
      setRegenSubmitting(false);
    }
  });

  async function copyCodes() {
    if (!regenCodes) return;
    await navigator.clipboard.writeText(regenCodes.join('\n'));
    toast.success(t('security.recovery.copied'));
  }

  // ── Passkey management ───────────────────────────────────────────────────────
  const [addOpen, setAddOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeyApiError, setPasskeyApiError] = useState<string>();
  const [addBusy, setAddBusy] = useState(false);
  const passkeyNameError =
    passkeyName.length > 64 ? t('security.passkeys.nameTooLong') : passkeyApiError;

  async function addPasskey(event: React.FormEvent) {
    event.preventDefault();
    setPasskeyApiError(undefined);
    if (passkeyNameError) return;
    setAddBusy(true);
    try {
      const optionsJSON = await securityApi.passkeyRegisterOptions();
      const attestation = await startRegistration({ optionsJSON });
      await securityApi.passkeyRegisterVerify(passkeyName.trim() || undefined, attestation);
      await queryClient.invalidateQueries({ queryKey: PASSKEYS_KEY });
      toast.success(t('security.passkeys.added'));
      setAddOpen(false);
      setPasskeyName('');
    } catch (err) {
      // A dismissed browser prompt is a user choice, not a failure.
      if ((err as Error)?.name === 'NotAllowedError') return;
      setPasskeyApiError(apiFieldErrors(err).name);
      toast.error((err as Error)?.message || t('security.passkeys.addFailed'));
    } finally {
      setAddBusy(false);
    }
  }

  const [removeBusy, setRemoveBusy] = useState<string | null>(null);
  async function removePasskey(passkey: Passkey) {
    const label = passkey.name || t('security.passkeys.unnamed');
    const ok = await confirm({
      title: t('security.passkeys.removeTitle'),
      description: t('security.passkeys.removeDescription', { name: label }),
      confirmText: t('security.passkeys.remove'),
      destructive: true,
    });
    if (!ok) return;
    setRemoveBusy(passkey.id);
    try {
      await securityApi.removePasskey(passkey.id);
      await queryClient.invalidateQueries({ queryKey: PASSKEYS_KEY });
      toast.success(t('security.passkeys.removed'));
    } catch (err) {
      toast.error((err as Error)?.message || t('security.passkeys.removeFailed'));
    } finally {
      setRemoveBusy(null);
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID');

  return (
    <div className="space-y-6">
      {/* Two-factor (TOTP) */}
      {TWO_FACTOR_ENABLED && (
        <div className="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {t('security.twoFactor.title')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('security.twoFactor.subtitle')}
              </p>
            </div>
            <Badge variant={twoFactorActive ? 'success' : 'warning'}>
              {twoFactorActive ? t('security.twoFactor.active') : t('security.twoFactor.pending')}
            </Badge>
          </div>

          {twoFactorActive ? (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t('security.recovery.subtitle')}</p>
              <Button
                variant="outline"
                data-testid="regenerate-recovery-button"
                onClick={() => setRegenOpen(true)}
              >
                {t('security.recovery.regenerate')}
              </Button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{t('security.twoFactor.incomplete')}</p>
              <Button
                data-testid="complete-2fa-button"
                onClick={() => router.push('/two-factor/setup')}
              >
                {t('security.twoFactor.setUp')}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Passkeys */}
      {PASSKEY_ENABLED && (
        <div className="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
          <div className="mb-1 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {t('security.passkeys.title')}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('security.passkeys.subtitle')}
              </p>
            </div>
            <Button
              variant="outline"
              data-testid="add-passkey-button"
              onClick={() => setAddOpen(true)}
            >
              <Plus size={18} aria-hidden="true" />
              {t('security.passkeys.add')}
            </Button>
          </div>

          {passkeysLoading ? (
            <LoadingState />
          ) : passkeysError ? (
            <ErrorState message={passkeysErr?.message} onRetry={() => void refetchPasskeys()} />
          ) : !passkeys?.length ? (
            <EmptyState title={t('security.passkeys.empty')} />
          ) : (
            <ul className="mt-5 divide-y divide-outline-variant">
              {passkeys.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium text-foreground"
                      data-testid="passkey-name"
                    >
                      {p.name || t('security.passkeys.unnamed')}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {p.lastUsedAt
                        ? t('security.passkeys.lastUsed', { date: formatDate(p.lastUsedAt) })
                        : t('security.passkeys.neverUsed')}
                      {' · '}
                      {t('security.passkeys.addedOn', { date: formatDate(p.createdAt) })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('security.passkeys.remove')}
                    disabled={removeBusy === p.id}
                    onClick={() => void removePasskey(p)}
                  >
                    <Trash2 size={18} className="text-destructive" aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Regenerate recovery codes */}
      <Modal
        open={regenOpen}
        onOpenChange={(open) => (open ? setRegenOpen(true) : closeRegen())}
        title={t('security.recovery.title')}
      >
        {regenCodes ? (
          <div>
            <p className="mb-3 text-sm text-muted-foreground">{t('security.recovery.showOnce')}</p>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container p-4 font-mono text-sm text-foreground">
              {regenCodes.map((code) => (
                <span key={code} className="select-none">
                  {code}
                </span>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => void copyCodes()}>
                {t('security.recovery.copy')}
              </Button>
              <Button onClick={closeRegen}>{t('common.done')}</Button>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={onRegenSubmit}>
            <p className="text-sm text-muted-foreground">{t('security.recovery.description')}</p>
            <PasswordField
              name="password"
              control={regenForm.control}
              label={t('security.recovery.password')}
              placeholder="••••••••"
              autocomplete="current-password"
              required
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={closeRegen}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={regenSubmitting}>
                {regenSubmitting ? t('common.working') : t('security.recovery.regenerate')}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add passkey */}
      <Modal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t('security.passkeys.addTitle')}
        description={t('security.passkeys.addDescription')}
      >
        <form className="space-y-5" onSubmit={addPasskey}>
          <Field
            label={t('security.passkeys.nameLabel')}
            error={passkeyNameError}
            hint={t('security.passkeys.nameHint')}
          >
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                value={passkeyName}
                onChange={(event) => setPasskeyName(event.target.value)}
                placeholder={t('security.passkeys.namePlaceholder')}
                maxLength={64}
                aria-describedby={describedBy}
                aria-invalid={invalid}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={addBusy}
              onClick={() => setAddOpen(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={addBusy}>
              {addBusy ? t('common.working') : t('security.passkeys.continue')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
