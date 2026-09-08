<script setup lang="ts">
defineProps<{
  title?: string;
  description?: string;
  asRow?: boolean;
  colspan?: number;
}>();
</script>

<template>
  <tr v-if="asRow">
    <td :colspan="colspan" class="p-8 text-center text-sm text-muted-foreground">
      {{ title ?? $t('state.empty') }}
    </td>
  </tr>
  <div v-else class="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <MaterialSymbol name="inbox" :size="40" class="text-muted-foreground" />
    <p class="text-sm font-medium">{{ title ?? $t('state.empty') }}</p>
    <p v-if="description" class="text-xs text-muted-foreground">{{ description }}</p>
    <slot />
  </div>
</template>
