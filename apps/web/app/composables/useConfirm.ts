/**
 * Promise-based confirmation for dangerous actions.
 *
 *   const { confirm } = useConfirm();
 *   if (await confirm({ title: 'Delete user?', destructive: true })) { … }
 *
 * One global host (`ui/ConfirmDialog.vue`, mounted in app.vue) renders the
 * shared MD3 AlertDialog; every call site just awaits a boolean. Resolves
 * false on cancel, scrim click, or Escape — everything but explicit confirm.
 */
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** Error-filled confirm button (destructive action). Default false. */
  destructive?: boolean;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export function useConfirm() {
  const pending = useState<PendingConfirm | null>('confirm-pending', () => null);

  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      pending.value = { ...options, resolve };
    });
  }

  /** Called only by the host: resolves the pending promise and clears state. */
  function settle(ok: boolean) {
    const p = pending.value;
    pending.value = null;
    p?.resolve(ok);
  }

  return { confirm, pending, settle };
}
