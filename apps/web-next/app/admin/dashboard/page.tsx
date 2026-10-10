'use client';

import { EmptyState, LoadingState } from '@/components/blocks/states';
import { PageHeading } from '@/components/blocks/page-heading';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useUsers } from '@/features/user';

/*
 * Dashboard — deliberately honest where the Nuxt variant ships template demo
 * numbers: the only metric shown is the real total from the users API, plus
 * quick links to real destinations. Charts join when there is real data to
 * plot (or a labeled demo requirement).
 */
export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { data, isLoading } = useUsers({ page: 1, limit: 1 });
  const total = data?.meta?.total;

  return (
    <div className="space-y-6">
      <PageHeading title={t('title')} subtitle={t('subtitle')} />

      {isLoading ? (
        <LoadingState />
      ) : total === undefined ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="flex flex-col gap-2 p-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
              <Users size={20} aria-hidden="true" />
            </span>
            <span className="text-xs font-medium text-muted-foreground">{t('metrics.users')}</span>
            <span className="text-3xl font-bold tracking-tight text-foreground">{total}</span>
          </Card>
        </div>
      )}

      <section aria-labelledby="quicklinks" className="space-y-3">
        <h2 id="quicklinks" className="text-sm font-semibold text-on-surface-variant">
          {t('quicklinksTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/admin/users"
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            {t('quicklinks.users')}
          </Link>
          <a
            href="https://github.com/hafiznugrahadev/nuxion#readme"
            target="_blank"
            rel="noopener"
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-4 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container"
          >
            {t('quicklinks.docs')}
          </a>
        </div>
      </section>
    </div>
  );
}
