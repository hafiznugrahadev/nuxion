'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Field } from '@/components/common/field';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { isWellKnownRole } from '@/lib/roles';
import type { Role } from '@nuxion/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { createRoleSchema, type RoleFormValues } from '../schemas';
import { useCreateRole, useUpdateRole } from '../hooks';

/**
 * Create + edit share this one modal (port of the Nuxt variant's
 * RoleFormModal). The name field is monospace UPPER_SNAKE_CASE; built-ins are
 * guarded off before the modal ever opens (the table disables the button) —
 * the disabled field is the defensive second layer for the same rule.
 */
export function RoleFormModal({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}) {
  const t = useTranslations('roles.form');
  const tAll = useTranslations();
  const isEdit = !!role;
  const locked = isWellKnownRole(role?.name ?? '');

  const create = useCreateRole();
  const update = useUpdateRole();
  const pending = create.isPending || update.isPending;

  // The schema is per-locale (validation messages localize like every other
  // user-visible string), so it is built where the translator lives.
  const schema = useMemo(() => createRoleSchema((key) => tAll(key)), [tAll]);
  const { control, handleSubmit, setError, reset } = useForm<RoleFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  // (Re)seed whenever the modal opens for a new target.
  useEffect(() => {
    if (!open) return;
    reset({ name: role?.name ?? '' });
  }, [open, role, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit && role) {
        await update.mutateAsync({ id: role.id, body: values });
      } else {
        await create.mutateAsync(values);
      }
      onOpenChange(false);
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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('newTitle')}
      description={isEdit ? t('editDesc') : t('newDesc')}
    >
      <form className="space-y-5" onSubmit={onSubmit}>
        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Field
              label={t('name')}
              error={fieldState.error?.message}
              hint={locked ? tAll('roles.protected') : t('nameHint')}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  type="text"
                  placeholder="CONTENT_EDITOR"
                  disabled={locked}
                  autoComplete="off"
                  spellCheck={false}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  className="font-mono uppercase tracking-wide placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
                />
              )}
            </Field>
          )}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={pending || locked}>
            {pending ? t('saving') : isEdit ? t('saveChanges') : t('createRole')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
