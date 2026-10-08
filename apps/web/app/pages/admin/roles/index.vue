<script setup lang="ts">
// Explicit barrel import — features/ is NOT auto-imported (SPEC boundary rule).
import { RoleTable } from '~/features/role';
import { useBranding } from '~/composables/useBranding';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const branding = useBranding();
useHead({ title: () => `Roles · ${branding.value.appName}` });
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      :title="$t('roles.title')"
      :breadcrumbs="[
        { label: $t('nav.dashboard'), to: '/admin/dashboard' },
        { label: $t('roles.title') },
      ]"
    />

    <RoleTable />
  </div>
</template>
