'use client';

import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { CircleAlert, Inbox, LoaderCircle } from 'lucide-react';

/** The admin state vocabulary (ports of the Nuxt Empty/Loading/Error blocks). */

export function EmptyState({ title, description }: { title?: string; description?: string }) {
  const t = useTranslations('state');
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <Inbox size={40} className="text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title ?? t('empty')}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

export function LoadingState() {
  const t = useTranslations('state');
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <LoaderCircle size={20} className="animate-spin" aria-hidden="true" />
      <span>{t('loading')}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const t = useTranslations('state');
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <CircleAlert size={40} className="text-destructive" aria-hidden="true" />
      <p className="text-sm font-medium">{t('error')}</p>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  );
}
