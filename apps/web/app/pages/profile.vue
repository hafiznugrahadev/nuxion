<script setup lang="ts">
// Explicit barrel import — features/ is NOT auto-imported (SPEC boundary rule).
import { ChangePasswordCard, PersonalInfoCard, ProfileHeaderCard, useMe } from '~/features/profile';
import { APP_NAME } from '~/lib/constants';

definePageMeta({ layout: 'dashboard', middleware: ['auth'] });
useHead({ title: `Profile · ${APP_NAME}` });

const { data: user, isLoading, isError, error, refetch } = useMe();
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      :title="$t('profile.title')"
      :breadcrumbs="[
        { label: $t('nav.dashboard'), to: '/dashboard' },
        { label: $t('profile.title') },
      ]"
    />

    <LoadingState v-if="isLoading && !user" />
    <ErrorState v-else-if="isError" :message="(error as Error)?.message" @retry="refetch()" />

    <div v-else-if="user" class="space-y-6">
      <ProfileHeaderCard :user="user" />
      <PersonalInfoCard :user="user" />
      <ChangePasswordCard />
    </div>
  </div>
</template>
