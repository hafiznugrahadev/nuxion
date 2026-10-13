'use client';

import { AlertDialog } from '@astryxdesign/core';
import { useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmHost {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmHost | null>(null);

interface PendingConfirm {
  options: ConfirmOptions;
  resolve: (ok: boolean) => void;
}

/**
 * Promise-based confirm dialog host — the port of the Nuxt variant's
 * useConfirm(). Every dangerous action in the app reads the same way:
 * `const ok = await confirm({ ..., destructive: true })`. The actual dialog
 * is rendered by ConfirmProvider (components/ui/confirm-dialog.tsx); this file
 * only owns the promise plumbing so the host stays render-free.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  // The latest pending promise survives re-renders via the state itself.
  const settle = useCallback((ok: boolean) => {
    setPending((current) => {
      current?.resolve(ok);
      return null;
    });
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  );

  const host = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={host}>
      {children}
      {pending && <ConfirmDialog pending={pending} onClose={settle} />}
    </ConfirmContext.Provider>
  );
}

/** The dialog piece, kept next to its host: the Astryx AlertDialog carries
 *  the alertdialog role, focus handling, and the destructive action styling. */
function ConfirmDialog({
  pending,
  onClose,
}: {
  pending: PendingConfirm;
  onClose: (ok: boolean) => void;
}) {
  const { options } = pending;
  const t = useTranslations('confirm');

  return (
    <AlertDialog
      isOpen
      onOpenChange={(open: boolean) => {
        if (!open) onClose(false);
      }}
      title={options.title}
      description={options.description ?? ''}
      cancelLabel={options.cancelText ?? t('cancel')}
      actionLabel={options.confirmText ?? t('ok')}
      actionVariant={options.destructive ? 'destructive' : 'primary'}
      onAction={() => onClose(true)}
    />
  );
}

export function useConfirm() {
  const host = useContext(ConfirmContext);
  if (!host) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return host;
}
