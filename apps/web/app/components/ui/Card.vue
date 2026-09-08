<script setup lang="ts">
import { cn } from '~/lib/utils';
const props = defineProps<{ class?: string }>();
</script>

<template>
  <!-- MD3 outlined card: 12dp corners, hairline outline-variant, no shadow
       (resting elevation is tonal, not a drop shadow). -->
  <div
    :class="
      cn(
        'rounded-lg border border-outline-variant bg-card text-card-foreground shadow-card',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
