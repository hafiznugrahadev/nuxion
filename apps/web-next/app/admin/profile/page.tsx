'use client';

import { ErrorState, LoadingState } from '@/components/blocks/states';
import { PageHeading } from '@/components/blocks/page-heading';
import { usePageTitle } from '@/lib/use-page-title';
import { useTranslations } from 'next-intl';
import { ChangePasswordCard, PersonalInfoCard, ProfileHeaderCard, useMe } from '@/features/profile';
import { SecuritySection } from '@/features/security';

export default function ProfilePage() {
  const t = useTranslations();
  usePageTitle(t('profile.title'));
  const { data: user, isLoading, isError, error, refetch } = useMe();

  return (
    <div className="space-y-6">
      <PageHeading
        title={t('profile.title')}
        breadcrumbs={[
          { label: t('nav.dashboard'), href: '/admin/dashboard' },
          { label: t('profile.title') },
        ]}
      />

      {isLoading && !user ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={error?.message} onRetry={() => void refetch()} />
      ) : user ? (
        <div className="space-y-6">
          <ProfileHeaderCard user={user} />
          <PersonalInfoCard user={user} />
          <ChangePasswordCard />
          <SecuritySection />
        </div>
      ) : null}
    </div>
  );
}
