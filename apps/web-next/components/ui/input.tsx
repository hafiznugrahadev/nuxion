import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InputHTMLAttributes, Ref } from 'react';

/**
 * MD3 outlined text field base (port of the Nuxt variant's ui/Input.vue).
 * Optional `prefixIcon` renders a non-interactive leading glyph with
 * matching inset padding.
 */
const BASE =
  'flex h-10 w-full rounded-sm border border-outline bg-transparent px-4 text-sm text-foreground transition-colors placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  prefixIcon?: LucideIcon;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ prefixIcon: Icon, className, ...props }: InputProps) {
  if (Icon) {
    return (
      <div className="relative w-full">
        <Icon
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          aria-hidden="true"
        />
        <input className={cn(BASE, 'pl-10', className)} {...props} />
      </div>
    );
  }
  return <input className={cn(BASE, className)} {...props} />;
}
