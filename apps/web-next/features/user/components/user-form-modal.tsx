'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Field } from '@/components/common/field';
import { applyApiFieldErrors } from '@/lib/api-errors';
import { useConfirm } from '@/lib/use-confirm';
import { roleLabel } from '@/lib/roles';
import { UserRole, type User } from '@nuxion/shared-types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useRoles } from '@/features/role';
import {
  createUserSchema,
  editUserSchema,
  type CreateUserValues,
  type EditUserValues,
} from '../schemas';
import { useCreateUser, useUpdateUser } from '../hooks';

/**
 * Create + edit share this one modal (port of the Nuxt variant's
 * UserFormModal): schema switched by mode, re-seeded whenever it opens for a
 * new target. Email is immutable on edit; a blank password means "keep
 * current". Role changes and privileged creations confirm first — the same
 * useConfirm() every dangerous action in the app goes through.
 */
export function UserFormModal({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}) {
  const t = useTranslations('users.form');
  const tAll = useTranslations();
  const { confirm } = useConfirm();
  const isEdit = !!user;

  // Assignable roles come from the catalog (custom roles included). While it
  // is unavailable, fall back to the built-ins; a user's held roles are
  // always unioned in so editing can never silently drop a custom role.
  const WELL_KNOWN = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER].map((name) => ({
    name,
  }));
  const { data: catalog } = useRoles();
  const availableRoles = (() => {
    const names = new Set<string>((catalog ?? WELL_KNOWN).map((r) => r.name));
    for (const held of user?.roles ?? []) names.add(held);
    return [...names];
  })();

  const create = useCreateUser();
  const update = useUpdateUser();
  const pending = create.isPending || update.isPending;

  const { control, handleSubmit, setError, reset } = useForm<CreateUserValues | EditUserValues>({
    resolver: zodResolver((isEdit ? editUserSchema : createUserSchema) as never) as never,
    defaultValues: { email: '', name: '', password: '', roles: [UserRole.USER] } as never,
  });

  // (Re)seed whenever the modal opens for a new target.
  useEffect(() => {
    if (!open) return;
    reset(
      user
        ? ({ name: user.name, password: '', roles: [...user.roles] } as EditUserValues)
        : ({ email: '', name: '', password: '', roles: [UserRole.USER] } as CreateUserValues),
    );
  }, [open, user, reset]);

  const onSubmit = handleSubmit(async (valuesRaw) => {
    if (pending) return;
    const values = valuesRaw as CreateUserValues;
    try {
      if (isEdit && user) {
        const body = { name: values.name, roles: values.roles };
        if (values.password) (body as { password?: string }).password = values.password;
        const rolesChanged =
          user.roles.length !== values.roles.length ||
          user.roles.some((role) => !values.roles.includes(role));
        if (rolesChanged || values.password) {
          const ok = await confirm({
            title: t('securityConfirmTitle'),
            description: [
              rolesChanged ? t('rolesConfirmDescription', { name: user.name }) : '',
              values.password ? t('passwordConfirmDescription', { name: user.name }) : '',
            ]
              .filter(Boolean)
              .join(' '),
            confirmText: t('saveChanges'),
            destructive: true,
          });
          if (!ok) return;
        }
        await update.mutateAsync({ id: user.id, body });
      } else {
        if (values.roles.some((role) => role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN)) {
          const ok = await confirm({
            title: t('privilegedCreateTitle'),
            description: t('privilegedCreateDescription', { name: values.name }),
            confirmText: t('createUser'),
            destructive: true,
          });
          if (!ok) return;
        }
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
        ['email', 'name', 'password', 'roles'],
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
        {/* Email — immutable on edit (disabled input still shows the value). */}
        <Controller
          control={control}
          name={'email' as never}
          render={({ field, fieldState }) => (
            <Field
              label={t('email')}
              error={fieldState.error?.message as string | undefined}
              required={!isEdit}
            >
              {({ id, describedBy, invalid }) =>
                isEdit ? (
                  <Input
                    id={id}
                    value={user?.email ?? ''}
                    disabled
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                ) : (
                  <Input
                    id={id}
                    ref={field.ref}
                    name={field.name}
                    value={(field.value as string) ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                  />
                )
              }
            </Field>
          )}
        />

        <Controller
          control={control}
          name="name"
          render={({ field, fieldState }) => (
            <Field label={t('name')} error={fieldState.error?.message} required>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="Full name"
                  autoComplete="name"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Field
              label={t('password')}
              error={fieldState.error?.message}
              hint={isEdit ? t('passwordHint') : undefined}
              required={!isEdit}
            >
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  ref={field.ref}
                  name={field.name}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                />
              )}
            </Field>
          )}
        />

        {/* Roles as a checkbox group — plain strings, catalog included. */}
        <Controller
          control={control}
          name="roles"
          render={({ field, fieldState }) => (
            <Field
              label={t('roles')}
              error={fieldState.error?.message as string | undefined}
              required
            >
              {({ id, describedBy }) => (
                <div
                  role="group"
                  aria-labelledby={id}
                  aria-describedby={describedBy}
                  className="space-y-1"
                >
                  {availableRoles.map((role) => {
                    const selected = (field.value as string[])?.includes(role);
                    return (
                      <label
                        key={role}
                        htmlFor={`role-${role}`}
                        className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm text-on-surface transition-colors hover:bg-on-surface/8"
                      >
                        <Checkbox
                          id={`role-${role}`}
                          checked={selected}
                          onChange={(event) => {
                            const next = new Set(field.value as string[]);
                            if (event.target.checked) next.add(role);
                            else next.delete(role);
                            field.onChange([...next]);
                          }}
                        />
                        {roleLabel(role, (key) => tAll(key))}
                      </label>
                    );
                  })}
                </div>
              )}
            </Field>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? t('saving') : isEdit ? t('saveChanges') : t('createUser')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
