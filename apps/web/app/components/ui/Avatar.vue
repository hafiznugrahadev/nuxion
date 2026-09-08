<script setup lang="ts">
import { AvatarRoot, AvatarImage, AvatarFallback } from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

/**
 * MD3 avatar: circular image with an initials fallback on primary-container.
 * Pass `initials` explicitly or let it derive from `alt`.
 */
const props = withDefaults(
  defineProps<{
    src?: string;
    alt?: string;
    initials?: string;
    class?: HTMLAttributes['class'];
  }>(),
  { src: '', alt: 'User', initials: '' },
);

const fallback = computed(
  () =>
    props.initials ||
    (props.alt || 'U')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') ||
    'U',
);
</script>

<template>
  <AvatarRoot :class="cn('flex h-10 w-10 shrink-0 overflow-hidden rounded-full', props.class)">
    <AvatarImage v-if="src" :src="src" :alt="alt" class="h-full w-full object-cover" />
    <AvatarFallback
      class="flex h-full w-full items-center justify-center bg-primary-container text-sm font-semibold text-on-primary-container"
    >
      {{ fallback }}
    </AvatarFallback>
  </AvatarRoot>
</template>
