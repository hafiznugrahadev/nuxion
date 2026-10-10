'use client';

import { PageHeading } from '@/components/blocks/page-heading';
import { Tabs } from '@/components/ui/tabs';
import { useTranslations } from 'next-intl';
import { BrandingTab } from '@/features/settings';

// Tabs from day one — future groups (general, mail, …) slot in without
// restructuring the page.
export default function SettingsPage() {
  const t = useTranslations();
  return (
    <div className="space-y-6">
      <PageHeading
        title={t('settings.title')}
        breadcrumbs={[
          { label: t('nav.dashboard'), href: '/admin/dashboard' },
          { label: t('settings.title') },
        ]}
      />

      <Tabs
        tabs={[{ value: 'branding', label: t('settings.tabs.branding') }]}
        panels={{
          branding: <BrandingTab />,
        }}
      />
    </div>
  );
}
