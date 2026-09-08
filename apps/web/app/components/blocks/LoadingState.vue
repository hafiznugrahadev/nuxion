<script setup lang="ts">
defineProps<{ asRow?: boolean; colspan?: number }>();
</script>

<template>
  <tr v-if="asRow">
    <td :colspan="colspan" class="p-8 text-center text-sm text-muted-foreground">
      <MaterialSymbol name="progress_activity" :size="20" class="mx-auto animate-spin" />
    </td>
  </tr>
  <div v-else class="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
    <MaterialSymbol name="progress_activity" :size="20" class="animate-spin" />
    <span>{{ $t('state.loading') }}</span>
  </div>
</template>
