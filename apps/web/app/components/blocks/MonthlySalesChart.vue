<script setup lang="ts">
import { computed } from 'vue';
import type { ApexOptions } from 'apexcharts';

/** Monthly sales bar chart (ApexCharts). Colors come from MD3 tokens, not hex. */
const { tokens, isDark } = useChartTokens();

const series = [
  {
    name: 'Sales',
    data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
  },
];

const options = computed<ApexOptions>(() => ({
  chart: {
    type: 'bar',
    fontFamily: tokens.value.font,
    toolbar: { show: false },
    background: 'transparent',
  },
  colors: [tokens.value.brand],
  plotOptions: {
    bar: { horizontal: false, columnWidth: '39%', borderRadius: 5, borderRadiusApplication: 'end' },
  },
  dataLabels: { enabled: false },
  stroke: { show: true, width: 4, colors: ['transparent'] },
  grid: {
    borderColor: tokens.value.grid,
    strokeDashArray: 4,
    yaxis: { lines: { show: true } },
  },
  xaxis: {
    categories: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: { style: { colors: tokens.value.label, fontSize: '12px' } },
  },
  yaxis: {
    labels: { style: { colors: tokens.value.label, fontSize: '12px' } },
  },
  legend: { show: false },
  tooltip: {
    theme: isDark.value ? 'dark' : 'light',
    y: { formatter: (val: number) => `${val}` },
  },
  fill: { opacity: 1 },
}));
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-foreground">Monthly Sales</h2>
    </div>
    <ClientOnly>
      <apexchart type="bar" height="320" :options="options" :series="series" />
      <template #fallback>
        <div class="h-[320px] animate-pulse rounded-lg bg-muted" />
      </template>
    </ClientOnly>
  </div>
</template>
