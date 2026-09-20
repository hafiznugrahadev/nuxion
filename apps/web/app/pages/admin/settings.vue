<script setup lang="ts">
// Explicit barrel import — features/ is NOT auto-imported (SPEC boundary rule).
import { BrandingTab } from '~/features/settings';
import { useBranding } from '~/composables/useBranding';

definePageMeta({ layout: 'admin', middleware: ['auth', 'admin'] });
const { t } = useI18n();
const branding = useBranding();
useHead({ title: () => `Settings · ${branding.value.appName}` });

// Tabs from day one — future groups (general, mail, …) slot in without
// restructuring the page.
const tab = ref('branding');
const tabs = computed(() => [
  { value: 'branding', label: t('settings.tabs.branding'), icon: 'palette' },
]);
</script>

<template>
  <div class="space-y-6">
    <PageHeading
      :title="$t('settings.title')"
      :breadcrumbs="[
        { label: $t('nav.dashboard'), to: '/admin/dashboard' },
        { label: $t('settings.title') },
      ]"
    />

    <Tabs v-model="tab" :tabs="tabs">
      <template #tab-branding>
        <BrandingTab />
      </template>
    </Tabs>
  </div>
</template>
