<script setup lang="ts">
import { computed } from 'vue';
import type { ApexOptions } from 'apexcharts';

/** Radial "monthly target" gauge. Colors come from MD3 tokens, not hex. */
const { tokens } = useChartTokens();

const series = [75.55];

const options = computed<ApexOptions>(() => ({
  chart: {
    type: 'radialBar',
    fontFamily: tokens.value.font,
    sparkline: { enabled: true },
    background: 'transparent',
  },
  colors: [tokens.value.brand],
  plotOptions: {
    radialBar: {
      startAngle: -85,
      endAngle: 85,
      hollow: { size: '70%' },
      track: { background: tokens.value.track, strokeWidth: '100%' },
      dataLabels: {
        name: { show: false },
        value: {
          fontSize: '34px',
          fontWeight: '700',
          offsetY: 8,
          color: tokens.value.strong,
          formatter: (val: number) => `${val}%`,
        },
      },
    },
  },
  fill: { type: 'solid', colors: [tokens.value.brand] },
  stroke: { lineCap: 'round' },
  labels: ['Progress'],
}));
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div class="mb-2">
      <h2 class="text-sm font-semibold text-foreground">Monthly Target</h2>
      <p class="mt-1 text-sm text-muted-foreground">Target you've set for this month</p>
    </div>

    <ClientOnly>
      <apexchart type="radialBar" height="260" :options="options" :series="series" />
      <template #fallback>
        <div class="mx-auto h-[260px] w-full animate-pulse rounded-xl bg-muted" />
      </template>
    </ClientOnly>

    <p class="-mt-4 text-center text-sm text-muted-foreground">
      You earned <span class="font-medium text-foreground">$3,287</span> today, higher than last
      month. Keep it up!
    </p>

    <div class="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center">
      <div>
        <p class="text-xs text-muted-foreground">Target</p>
        <p class="mt-1 text-sm font-semibold text-foreground">$20K</p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Revenue</p>
        <p class="mt-1 text-sm font-semibold text-foreground">$16K</p>
      </div>
      <div>
        <p class="text-xs text-muted-foreground">Today</p>
        <p class="mt-1 text-sm font-semibold text-foreground">$3.2K</p>
      </div>
    </div>
  </div>
</template>
