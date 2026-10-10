'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { useId, type InputHTMLAttributes, type Ref } from 'react';

/**
 * MD3 checkbox: rounded 2dp box, primary fill when checked. Plain input +
 * visual overlay so native form semantics and screen readers stay intact.
 */
export function Checkbox({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  const fallbackId = useId();
  return (
    <span className={cn('relative inline-flex h-5 w-5 shrink-0', className)}>
      <input
        type="checkbox"
        id={props.id ?? fallbackId}
        ref={ref}
        className="peer absolute inset-0 h-full w-full cursor-pointer appearance-none"
        {...props}
      />
      <span
        className="pointer-events-none flex h-5 w-5 items-center justify-center rounded-[2px] border border-outline bg-transparent transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
        aria-hidden="true"
      >
        {props.checked && (
          <Check size={14} className="text-primary-foreground" aria-hidden="true" />
        )}
      </span>
    </span>
  );
}
