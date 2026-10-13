'use client';

import { Dialog, DialogHeader } from '@astryxdesign/core';
import type { ReactNode } from 'react';

/*
 * Thin adaptor over the Astryx Dialog docked to the inline-end edge: the
 * right-side filter panel keeps its contract (controlled open/onOpenChange,
 * title/description) while the system owns focus, Escape and the scrim.
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
  return (
    <Dialog
      isOpen={open}
      onOpenChange={onOpenChange}
      position={{ end: 0, top: 0, bottom: 0 }}
      maxHeight="100dvh"
      width={320}
      className={className}
    >
      <DialogHeader title={title} subtitle={description} onOpenChange={onOpenChange} />
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
    </Dialog>
  );
}
