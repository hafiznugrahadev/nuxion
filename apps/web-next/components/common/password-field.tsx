'use client';

import { Field } from '@/components/common/field';
import { TextInput } from '@astryxdesign/core';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * Password input with the show/hide eye, RHF-integrated (port of the Nuxt
 * variant's PasswordField), rendered by the Astryx TextInput. The eye toggle
 * overlays the control end via containerClassName (the system input has no
 * suffix slot; no authored StyleX needed). `autocomplete` is passed through
 * for password managers ('current-password' | 'new-password').
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
  prefixIcon: PrefixIcon,
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
          <TextInput
            label=""
            isLabelHidden
            id={id}
            ref={field.ref}
            htmlName={field.name}
            value={field.value ?? ''}
            onChange={(value: string) => field.onChange(value)}
            onBlur={field.onBlur}
            type={show ? 'text' : 'password'}
            placeholder={placeholder}
            autoComplete={autocomplete}
            startIcon={PrefixIcon ? <PrefixIcon size={16} aria-hidden="true" /> : undefined}
            status={invalid ? { type: 'error' } : undefined}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            controlClassName="pr-12"
          />
          <button
            type="button"
            className="absolute right-2 top-[calc(50%-0.25rem)] flex h-8 w-8 translate-y-[-50%] items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
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
