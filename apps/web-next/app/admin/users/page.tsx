'use client';

import { PageHeading } from '@/components/blocks/page-heading';
import { useTranslations } from 'next-intl';
import { UsersTable } from '@/features/user';

// Thin page: the feature slice owns the table (explicit barrel import —
// features/ is not auto-imported).
export default function UsersPage() {
  const t = useTranslations();
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
