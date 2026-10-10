import { describe, expect, it } from 'vitest';
import { act } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { ConfirmProvider, useConfirm } from './use-confirm';
import { renderJsx, renderHook } from './test-render';

const MESSAGES = { confirm: { cancel: 'Batal', ok: 'Konfirmasi' } };

function withIntl(props: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="en" messages={MESSAGES}>
      <ConfirmProvider>{props.children}</ConfirmProvider>
    </NextIntlClientProvider>
  );
}

function dialog(): HTMLElement {
  return document.querySelector('[role="alertdialog"]') as HTMLElement;
}

describe('useConfirm', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useConfirm())).toThrow(/ConfirmProvider/);
  });

  it('resolves true when the confirm button is clicked', async () => {
    const { result, unmount } = renderHook(() => useConfirm(), withIntl);
    let promise!: Promise<boolean>;
    await act(async () => {
      promise = result.current.confirm({ title: 'Delete?', destructive: true });
    });
    const buttons = [...dialog().querySelectorAll('button')] as HTMLButtonElement[];
    await act(async () => {
      buttons[buttons.length - 1]!.click();
    });
    await expect(promise).resolves.toBe(true);
    unmount();
  });

  it('resolves false from the cancel button', async () => {
    const { result, unmount } = renderHook(() => useConfirm(), withIntl);
    let promise!: Promise<boolean>;
    await act(async () => {
      promise = result.current.confirm({ title: 'Delete?' });
    });
    const buttons = [...dialog().querySelectorAll('button')] as HTMLButtonElement[];
    await act(async () => {
      buttons[0]!.click();
    });
    await expect(promise).resolves.toBe(false);
    unmount();
  });

  it('closes on Escape (resolving false)', async () => {
    const { result, unmount } = renderHook(() => useConfirm(), withIntl);
    let promise!: Promise<boolean>;
    await act(async () => {
      promise = result.current.confirm({ title: 'Delete?' });
    });
    await act(async () => {
      dialog().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    await expect(promise).resolves.toBe(false);
    unmount();
  });

  it('renders title/description and honors option labels', async () => {
    const { host, unmount } = renderJsx(
      <NextIntlClientProvider locale="en" messages={MESSAGES}>
        <ConfirmProvider>
          <Consumer
            options={{
              title: 'Hapus peran?',
              description: 'Tidak dapat dibatalkan.',
              confirmText: 'Hapus',
              cancelText: 'Batal',
            }}
          />
        </ConfirmProvider>
      </NextIntlClientProvider>,
    );
    await act(async () => {
      (host.querySelector('button') as HTMLButtonElement).click();
    });
    expect(host.textContent).toContain('Hapus peran?');
    expect(host.textContent).toContain('Tidak dapat dibatalkan.');
    expect(host.textContent).toContain('Hapus');
    unmount();
  });
});

function Consumer({
  options,
}: {
  options: { title: string; description?: string; confirmText?: string; cancelText?: string };
}) {
  const { confirm } = useConfirm();
  return (
    <button type="button" onClick={() => void confirm(options)}>
      ask
    </button>
  );
}
