<script setup lang="ts">
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 skeleton: tonal placeholder block (surface-container-highest) with the
 * standard pulse. Size/shape come from the class you pass.
 */
const props = defineProps<{ class?: HTMLAttributes['class'] }>();
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-surface-container-highest', props.class)" />
</template>
