'use client';

import { PageHeading } from '@/components/blocks/page-heading';
import { usePageTitle } from '@/lib/use-page-title';
import { useTranslations } from 'next-intl';
import { UsersTable } from '@/features/user';

// Thin page: the feature slice owns the table (explicit barrel import —
// features/ is not auto-imported).
export default function UsersPage() {
  const t = useTranslations();
  usePageTitle(t('users.title'));
  return (
    <div className="space-y-6">
      <PageHeading
        title={t('users.title')}
        breadcrumbs={[
          { label: t('nav.dashboard'), href: '/admin/dashboard' },
          { label: t('users.title') },
        ]}
      />
      <UsersTable />
    </div>
  );
}
