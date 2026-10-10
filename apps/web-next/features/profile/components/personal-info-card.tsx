'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/common/field';
import { TextField } from '@/components/common/text-field';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { roleLabel } from '@/lib/roles';
import type { User } from '@nuxion/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateProfile } from '../hooks';

/** Read-only personal info with an inline edit form (email immutable). */
const schema = z.object({ name: z.string().min(2, 'Name must be at least 2 characters') });

export function PersonalInfoCard({ user }: { user: User }) {
  const t = useTranslations();
  const [editing, setEditing] = useState(false);
  const update = useUpdateProfile();

  const { control, handleSubmit, reset, setError } = useForm<{ name: string }>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name },
  });

  function startEdit() {
    reset({ name: user.name });
    setEditing(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ name: values.name });
      setEditing(false);
    } catch (err) {
      applyApiFieldErrors(
        err,
        (errors) => {
          for (const [field, message] of Object.entries(errors))
            setError(field as never, { message });
        },
        ['name'],
      );
    }
  });

  return (
    <div className="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-foreground">
          {t('profile.personalInfo.title')}
        </h3>
        {!editing && (
          <Button variant="outline" size="sm" onClick={startEdit}>
            <Pencil size={18} aria-hidden="true" />
            {t('profile.personalInfo.edit')}
          </Button>
        )}
      </div>

      {/* Read-only view */}
      {!editing ? (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              {t('profile.personalInfo.fullName')}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              {t('profile.personalInfo.emailAddress')}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium text-muted-foreground">
              {t('profile.personalInfo.roles')}
            </dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {user.roles.map((role) => (
                <Badge key={role} variant="muted">
                  {roleLabel(role, (key) => t(key))}
                </Badge>
              ))}
            </dd>
          </div>
        </dl>
      ) : (
        /* Edit form */
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              name="name"
              control={control}
              label={t('profile.personalInfo.fullName')}
              placeholder="Your name"
            />
            <Field
              label={t('profile.personalInfo.emailAddress')}
              hint={t('profile.personalInfo.emailHint')}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  value={user.email}
                  disabled
                  className="cursor-not-allowed opacity-70"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={() => setEditing(false)}
            >
              {t('profile.personalInfo.cancel')}
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending
                ? t('profile.personalInfo.saving')
                : t('profile.personalInfo.saveChanges')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
