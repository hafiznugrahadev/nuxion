<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';
import { cn } from '~/lib/utils';

const props = defineProps<{
  name: string;
  label?: string;
  min?: string;
  max?: string;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<string>(toRef(props, 'name'));
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="name" class="text-sm font-medium leading-none">
      {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
    </label>
    <input
      :id="name"
      v-model="value"
      type="date"
      :min="min"
      :max="max"
      :class="
        cn(
          'flex h-10 w-full rounded-sm border border-outline bg-transparent px-4 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          errorMessage && 'border-destructive focus:border-destructive focus:ring-destructive',
        )
      "
    />
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
    <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
  </div>
</template>
