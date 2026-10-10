'use client';

import { useNotifications, type Notification } from '@/lib/use-notifications';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  CircleAlert,
  CircleCheck,
  CircleX,
  Inbox,
  Info,
  type LucideIcon,
} from 'lucide-react';

const typeIcon: Record<string, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  warning: CircleAlert,
  error: CircleX,
};
// Status inks resolve through the app's status tokens (semantic in both themes).
const typeClass: Record<string, string> = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * MD3 notification bell with a popover panel (port of the Nuxt variant's
 * NotificationPanel). The fetch only runs once the panel opens with a session;
 * the bell renders without a count when it fails. Closable with Escape and
 * the scrim, like every popover in this app.
 */
export function NotificationPanel() {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      {/* MD3 standard icon button: 40dp circle, state-layer hover, no border */}
      <button
        type="button"
        className="touch-target relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground"
        aria-label={t('notifications.title')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={22} aria-hidden="true" />
        {/* MD3 badge: error-colored dot */}
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface" />
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label={t('notifications.title')}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg bg-surface-container-high p-0 text-foreground shadow-theme-md outline-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <span className="text-sm font-semibold text-foreground">
                {t('notifications.title')}
              </span>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-sm px-1.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  onClick={() => markAllRead.mutate()}
                >
                  <Check size={14} aria-hidden="true" />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <span className="text-sm text-muted-foreground">{t('state.loading')}</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 py-8 text-center">
                  <Inbox size={32} className="text-muted-foreground" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{t('notifications.empty')}</p>
                  <p className="text-xs text-muted-foreground">{t('notifications.emptyHint')}</p>
                </div>
              ) : (
                <ul>
                  {notifications.map((n: Notification) => {
                    const Icon = typeIcon[n.type] ?? Info;
                    return (
                      <li
                        key={n.id}
                        className={`flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-on-surface-variant/8 ${
                          !n.readAt ? 'bg-secondary-container/40' : ''
                        }`}
                        onClick={() => markRead.mutate(n.id)}
                      >
                        <Icon
                          size={18}
                          className={`mt-0.5 shrink-0 ${typeClass[n.type] ?? 'text-muted-foreground'}`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm text-foreground ${!n.readAt ? 'font-semibold' : 'font-medium'}`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground/70">
                            {relativeTime(n.createdAt)}
                          </p>
                        </div>
                        {!n.readAt && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-error" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
