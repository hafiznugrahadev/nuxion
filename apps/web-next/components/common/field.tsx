'use client';

import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useId, type ReactNode } from 'react';

/**
 * Label + control + error/hint with the aria wiring the Nuxt variant's
 * Fieldset carries: the control receives its id, aria-describedby (error
 * first, hint second) and aria-invalid through the render prop, so screen
 * readers announce exactly what sighted users see.
 */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (aria: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = error ? (hint ? `${errorId} ${hintId}` : errorId) : hint ? hintId : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={id}>
          {label}
          {required && (
            <span className="text-destructive" aria-hidden="true">
              {' '}
              *
            </span>
          )}
        </Label>
      )}
      {children({ id, describedBy, invalid: !!error })}
      {error ? (
        <p role="alert" id={errorId} className="text-xs font-normal text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-xs font-normal leading-normal text-on-surface-variant">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
