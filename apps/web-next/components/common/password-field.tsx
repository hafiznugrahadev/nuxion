'use client';

import { Field } from '@/components/common/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * Password input with the show/hide eye, RHF-integrated (port of the Nuxt
 * variant's PasswordField). `autocomplete` is passed through for password
 * managers ('current-password' | 'new-password').
 */
export interface PasswordFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  prefixIcon?: LucideIcon;
  hint?: string;
  autocomplete?: string;
}

export function PasswordField<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  required,
  prefixIcon,
  hint,
  autocomplete,
}: PasswordFieldProps<T>) {
  const t = useTranslations('auth');
  const { field, fieldState } = useController({ name, control });
  const [show, setShow] = useState(false);
  const error = fieldState.error?.message;

  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <div className="relative">
          <Input
            id={id}
            ref={field.ref}
            name={field.name}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            type={show ? 'text' : 'password'}
            placeholder={placeholder}
            prefixIcon={prefixIcon}
            autoComplete={autocomplete}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            className={cn(
              'pr-12',
              error && 'border-destructive focus:border-destructive focus:ring-destructive',
            )}
          />
          <button
            type="button"
            className="touch-target absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground [--touch-slop:-6px]"
            aria-label={show ? t('hidePassword') : t('showPassword')}
            aria-pressed={show}
            onClick={() => setShow((value) => !value)}
          >
            {show ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      )}
    </Field>
  );
}
