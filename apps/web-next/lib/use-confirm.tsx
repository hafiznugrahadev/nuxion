'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
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

/** The dialog piece, kept next to its host so escape/scrim live with the UI. */
function ConfirmDialog({
  pending,
  onClose,
}: {
  pending: PendingConfirm;
  onClose: (ok: boolean) => void;
}) {
  const { options } = pending;
  const t = useTranslations('confirm');
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-scrim"
        onClick={() => onClose(false)}
        aria-hidden="true"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-sm rounded-2xl bg-surface-container-low p-6 shadow-theme-lg"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose(false);
        }}
      >
        <h2 id="confirm-title" className="text-lg font-semibold text-on-surface">
          {options.title}
        </h2>
        {options.description && (
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {options.description}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            autoFocus
            className="state-layer relative h-10 rounded-full bg-secondary px-6 text-sm font-medium text-secondary-foreground"
            onClick={() => onClose(false)}
          >
            {options.cancelText ?? t('cancel')}
          </button>
          <button
            type="button"
            className={`state-layer relative h-10 rounded-full px-6 text-sm font-medium ${
              options.destructive
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-primary text-primary-foreground'
            }`}
            onClick={() => onClose(true)}
          >
            {options.confirmText ?? t('ok')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const host = useContext(ConfirmContext);
  if (!host) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return host;
}
