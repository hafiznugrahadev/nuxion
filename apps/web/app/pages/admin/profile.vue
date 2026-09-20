<script setup lang="ts">
// Explicit barrel import — features/ is NOT auto-imported (SPEC boundary rule).
import { ChangePasswordCard, PersonalInfoCard, ProfileHeaderCard, useMe } from '~/features/profile';
import { SecuritySection } from '~/features/security';
import { useBranding } from '~/composables/useBranding';

definePageMeta({ layout: 'admin', middleware: ['auth'] });
const branding = useBranding();
useHead({ title: () => `Profile · ${branding.value.appName}` });

const { data: user, isLoading, isError, error, refetch } = useMe();
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      :title="$t('profile.title')"
      :breadcrumbs="[
        { label: $t('nav.dashboard'), to: '/admin/dashboard' },
        { label: $t('profile.title') },
      ]"
    />

    <LoadingState v-if="isLoading && !user" />
    <ErrorState v-else-if="isError" :message="(error as Error)?.message" @retry="refetch()" />

    <div v-else-if="user" class="space-y-6">
      <ProfileHeaderCard :user="user" />
      <PersonalInfoCard :user="user" />
      <ChangePasswordCard />
      <SecuritySection />
    </div>
  </div>
</template>
