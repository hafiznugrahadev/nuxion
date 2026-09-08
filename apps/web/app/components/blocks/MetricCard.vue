<script setup lang="ts">
/**
 * MD3 KPI card: tonal icon tile, label + value, and a trend badge.
 */
const props = defineProps<{
  label: string;
  value: string;
  icon: string; // Material Symbols name
  change?: number; // signed percentage; positive = up
}>();

const isUp = computed(() => (props.change ?? 0) >= 0);
</script>

<template>
  <div class="rounded-lg border border-outline-variant bg-card p-5 sm:p-6">
    <div
      class="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary-container text-on-secondary-container"
    >
      <MaterialSymbol :name="icon" :size="20" />
    </div>

    <div class="mt-5 flex items-end justify-between gap-3">
      <div>
        <p class="text-sm text-muted-foreground">{{ label }}</p>
        <p class="mt-1 text-xl font-bold tracking-tight text-foreground">{{ value }}</p>
      </div>

      <span
        v-if="change !== undefined"
        :class="[
          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
          isUp ? 'bg-success/12 text-success' : 'bg-error/12 text-error',
        ]"
      >
        <MaterialSymbol :name="isUp ? 'arrow_upward' : 'arrow_downward'" :size="14" />
        {{ Math.abs(change).toFixed(2) }}%
      </span>
    </div>
  </div>
</template>
