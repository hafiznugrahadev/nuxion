'use client';

import { Dialog, DialogHeader } from '@astryxdesign/core';
import type { ReactNode } from 'react';

/*
 * Thin adaptor over the Astryx Dialog (native <dialog>: focus trap, Escape,
 * scrim and initial focus come from the system). The MD3-era contract —
 * controlled open/onOpenChange, string title/description, arbitrary children —
 * is unchanged for the four call sites (user/role form modals, security).
 */
export function Modal({
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
      className={className}
      width={448}
    >
      <DialogHeader title={title} subtitle={description} onOpenChange={onOpenChange} />
      {children}
    </Dialog>
  );
}
