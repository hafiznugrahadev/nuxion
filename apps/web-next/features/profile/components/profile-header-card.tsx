'use client';

import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/common/field';
import { apiFieldErrors } from '@/lib/api-errors';
import { roleLabel } from '@/lib/roles';
import { uploadFile } from '@/lib/upload';
import type { User } from '@nuxion/shared-types';
import { Camera, LoaderCircle, Mail, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import { useUpdateProfile } from '../hooks';

/**
 * Profile header: avatar with an upload affordance (pick → POST /files →
 * PATCH /users/me with the URL), name, role + email, role badges. Port of the
 * Nuxt variant's ProfileHeaderCard.
 */
export function ProfileHeaderCard({ user }: { user: User }) {
  const t = useTranslations();
  const update = useUpdateProfile();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string>();

  const initials = (() => {
    const name = user.name?.trim();
    if (!name) return 'U';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');
  })();
  const primaryRole = user.roles?.[0] ?? 'USER';
  const MAX_MB = 5;

  function onPick(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    setAvatarError(undefined);
    if (!file.type.startsWith('image/')) {
      setAvatarError(t('profile.avatar.notImage'));
      toast.error(t('profile.avatar.notImage'));
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setAvatarError(t('profile.avatar.tooLarge', { mb: MAX_MB }));
      toast.error(t('profile.avatar.tooLarge', { mb: MAX_MB }));
      return;
    }

    setUploading(true);
    void (async () => {
      try {
        const { url } = await uploadFile(file, 'avatars');
        await update.mutateAsync({ avatarUrl: url }).catch((err) => {
          setAvatarError(apiFieldErrors(err).avatarUrl);
        });
      } catch (err) {
        const message =
          apiFieldErrors(err).file || (err as Error)?.message || t('profile.avatar.uploadFailed');
        setAvatarError(message);
        toast.error(message);
      } finally {
        setUploading(false);
        if (fileInput.current) fileInput.current.value = '';
      }
    })();
  }

  return (
    <div className="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
        <Field error={avatarError} className="shrink-0 sm:max-w-44">
          {({ id, describedBy, invalid }) => (
            <div className="relative h-20 w-20">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- API-served avatar URL
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container text-2xl font-semibold text-on-primary-container">
                  {initials}
                </span>
              )}

              {/* MD3 small FAB (primary-container) */}
              <button
                type="button"
                className="state-layer touch-target absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-lg border-2 border-card bg-primary-container text-on-primary-container shadow disabled:opacity-60 [--touch-slop:-6px]"
                disabled={uploading}
                aria-label={uploading ? t('common.working') : t('profile.avatar.change')}
                aria-describedby={describedBy}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Camera size={14} aria-hidden="true" />
                )}
              </button>
              <input
                id={id}
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                aria-label={t('profile.avatar.change')}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                onChange={onPick}
              />
            </div>
          )}
        </Field>

        <div className="flex-1 text-center sm:text-left">
          <h2 className="text-lg font-semibold text-foreground">{user.name}</h2>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground sm:justify-start">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={18} aria-hidden="true" />
              {roleLabel(primaryRole, (key) => t(key))}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail size={18} aria-hidden="true" />
              {user.email}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
          {user.roles.map((role) => (
            <Badge key={role} variant="muted">
              {roleLabel(role, (key) => t(key))}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
