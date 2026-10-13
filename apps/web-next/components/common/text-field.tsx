'use client';

import { Field } from '@/components/common/field';
import { TextInput } from '@astryxdesign/core';
import type { LucideIcon } from 'lucide-react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * Label + input + error, integrated with React Hook Form via useController —
 * the port of the Nuxt variant's VeeValidate TextField, rendered by the
 * Astryx TextInput (structure, focus and invalid styling from the system).
 * Validation lives in the form's zod schema; this component only renders the
 * result — the error message itself stays owned by Field (single alert, wired
 * through aria-describedby), so the system status is passed type-only.
 */
export interface TextFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  prefixIcon?: LucideIcon;
  hint?: string;
  inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
  maxLength?: number;
  /** Passed through for autofill (e.g. 'one-time-code' on OTP fields). */
  autocomplete?: string;
  disabled?: boolean;
}

export function TextField<T extends FieldValues>({
  name,
  control,
  label,
  type = 'text',
  placeholder,
  required,
  prefixIcon: PrefixIcon,
  hint,
  inputmode,
  maxLength,
  autocomplete,
  disabled,
}: TextFieldProps<T>) {
  const { field, fieldState } = useController({ name, control });
  const error = fieldState.error?.message;

  return (
    <Field label={label} error={error} hint={hint} required={required}>
      {({ id, describedBy, invalid }) => (
        <TextInput
          label=""
          isLabelHidden
          id={id}
          ref={field.ref}
          htmlName={field.name}
          value={field.value ?? ''}
          onChange={(value: string) => field.onChange(value)}
          onBlur={field.onBlur}
          type={type === 'email' ? 'email' : type === 'password' ? 'password' : 'text'}
          placeholder={placeholder}
          autoComplete={autocomplete}
          // Native attrs the TextInput types do not declare; they reach the
          // <input> through its rest-props passthrough.
          {...({ inputMode: inputmode, maxLength } as Record<string, unknown>)}
          isDisabled={disabled}
          startIcon={PrefixIcon ? <PrefixIcon size={16} aria-hidden="true" /> : undefined}
          status={invalid ? { type: 'error' } : undefined}
          aria-describedby={describedBy}
          aria-invalid={invalid}
        />
      )}
    </Field>
  );
}
