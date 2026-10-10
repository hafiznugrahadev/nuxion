'use client';

import { Button, type ButtonProps } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

/**
 * Copy-to-clipboard button with snackbar feedback — the landing's only
 * interactive piece. Sits at every command sample (hero CTA, scaffolder
 * card, terminals, CTA banner); content comes from the call site.
 */
export function CopyButton({ text, children, ...button }: ButtonProps & { text: string }) {
  const t = useTranslations();

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('home.copied'));
    } catch {
      toast.error(t('state.error'));
    }
  }

  return (
    <Button type="button" {...button} onClick={copy}>
      {children}
    </Button>
  );
}
