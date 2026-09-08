<script setup lang="ts">
import type { Crumb } from '~/components/ui/Breadcrumb.vue';

/**
 * The standard admin page heading (dashboard style): bold title, optional
 * muted subtitle, optional breadcrumb trail on the right.
 *
 * Nuxt pages cannot fill named slots of their layout (layout slots come from
 * app.vue, not per-page), so this component IS the layout's heading contract:
 * every dashboard-layout page opens with it — title required, subtitle and
 * breadcrumbs optional — which keeps headings identical across pages.
 */
defineProps<{ title: string; subtitle?: string; breadcrumbs?: Crumb[] }>();
</script>

<template>
  <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="text-xl font-bold tracking-tight text-foreground">{{ title }}</h1>
      <p v-if="subtitle" class="text-sm text-muted-foreground">{{ subtitle }}</p>
    </div>
    <Breadcrumb v-if="breadcrumbs?.length" :items="breadcrumbs" />
  </div>
</template>
