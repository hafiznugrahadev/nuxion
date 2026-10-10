import { cn } from '@/lib/utils';
import type { LabelHTMLAttributes } from 'react';

// Plain <label> (no Radix Label needed for the current surfaces): the Field
// component owns the htmlFor/id wiring.
export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        'select-none text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    />
  );
}
