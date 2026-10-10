'use client';

import { PageHeading } from '@/components/blocks/page-heading';
import { usePageTitle } from '@/lib/use-page-title';
import { useTranslations } from 'next-intl';
import { RolesTable } from '@/features/role';

// Thin page: the feature slice owns the table (explicit barrel import —
// features/ is not auto-imported).
export default function RolesPage() {
  const t = useTranslations();
  usePageTitle(t('roles.title'));
  return (
    <div className="space-y-6">
      <PageHeading
        title={t('roles.title')}
        subtitle={t('roles.subtitle')}
        breadcrumbs={[
          { label: t('nav.dashboard'), href: '/admin/dashboard' },
          { label: t('roles.title') },
        ]}
      />
      <RolesTable />
    </div>
  );
}
