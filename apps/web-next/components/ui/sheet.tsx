'use client';

import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

/**
 * Right-side sheet (port of the Nuxt variant's Sheet surface): the filter
 * panel container. Slide-in from the right (keyframes in globals.css),
 * closable with Escape and the scrim.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 animate-[fade-in_150ms_ease-out] bg-scrim"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        className={cn(
          'absolute inset-y-0 right-0 flex w-80 max-w-[85vw] animate-[slide-in-right_300ms_var(--ease-emphasized-decelerate)] flex-col bg-surface-container-low shadow-theme-lg',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant p-5">
          <div>
            <h2 id="sheet-title" className="text-base font-semibold text-on-surface">
              {title}
            </h2>
            {description && <p className="mt-1 text-xs text-on-surface-variant">{description}</p>}
          </div>
          <button
            type="button"
            className="touch-target relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
