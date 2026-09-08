<script setup lang="ts">
import { APP_NAME } from '~/lib/constants';

definePageMeta({ layout: 'admin', middleware: ['auth'] });
useHead({ title: `Dashboard · ${APP_NAME}` });

const { t } = useI18n();

const metrics = computed(() => [
  { label: t('dashboard.metrics.customers'), value: '3,782', icon: 'group', change: 11.01 },
  { label: t('dashboard.metrics.orders'), value: '5,359', icon: 'shopping_cart', change: -9.05 },
  { label: t('dashboard.metrics.revenue'), value: '$45.2K', icon: 'payments', change: 4.3 },
  { label: t('dashboard.metrics.growth'), value: '8.21%', icon: 'trending_up', change: 1.05 },
]);
</script>

<template>
  <div class="space-y-6">
    <PageHeading :title="$t('dashboard.title')" :subtitle="$t('dashboard.subtitle')" />

    <!-- KPI cards -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        v-for="m in metrics"
        :key="m.label"
        :label="m.label"
        :value="m.value"
        :icon="m.icon"
        :change="m.change"
      />
    </div>

    <!-- Charts -->
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <MonthlySalesChart />
      </div>
      <MonthlyTarget />
    </div>
  </div>
</template>
