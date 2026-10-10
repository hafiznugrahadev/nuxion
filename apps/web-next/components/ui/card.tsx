import { cn } from '@/lib/utils';
import type { HTMLAttributes } from 'react';

/** MD3 outlined card: tonal surface-container-low, hairline border, 12dp corners. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-outline-variant/40 bg-surface-container-low',
        className,
      )}
      {...props}
    />
  );
}
