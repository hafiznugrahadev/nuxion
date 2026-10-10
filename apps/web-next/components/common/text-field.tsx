'use client';

import { Field } from '@/components/common/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { useController, type Control, type FieldValues, type Path } from 'react-hook-form';

/**
 * Label + input + error, integrated with React Hook Form via useController —
 * the port of the Nuxt variant's VeeValidate TextField. Validation lives in
 * the form's zod schema; this component only renders the result.
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
  prefixIcon,
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
        <Input
          id={id}
          ref={field.ref}
          name={field.name}
          value={field.value ?? ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          type={type}
          placeholder={placeholder}
          prefixIcon={prefixIcon}
          inputMode={inputmode}
          maxLength={maxLength}
          autoComplete={autocomplete}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={invalid}
          className={cn(
            error && 'border-destructive focus:border-destructive focus:ring-destructive',
          )}
        />
      )}
    </Field>
  );
}
