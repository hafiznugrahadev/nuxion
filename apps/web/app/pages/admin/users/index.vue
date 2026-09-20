<script setup lang="ts">
// Explicit barrel import — features/ is NOT auto-imported (SPEC boundary rule).
import { UserTable } from '~/features/user';
import { useBranding } from '~/composables/useBranding';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const branding = useBranding();
useHead({ title: () => `Users · ${branding.value.appName}` });
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      :title="$t('users.title')"
      :breadcrumbs="[
        { label: $t('nav.dashboard'), to: '/admin/dashboard' },
        { label: $t('users.title') },
      ]"
    />

    <UserTable />
  </div>
</template>
