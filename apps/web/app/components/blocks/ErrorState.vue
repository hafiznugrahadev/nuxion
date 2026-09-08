<script setup lang="ts">
defineProps<{ title?: string; message?: string }>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <MaterialSymbol name="warning" :size="40" class="text-destructive" />
    <p class="text-sm font-medium">{{ title ?? $t('state.error') }}</p>
    <p v-if="message" class="text-xs text-muted-foreground">{{ message }}</p>
    <Button variant="outline" size="sm" class="mt-2" @click="$emit('retry')">{{
      $t('state.retry')
    }}</Button>
  </div>
</template>
