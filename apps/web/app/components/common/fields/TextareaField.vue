<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';
import { cn } from '~/lib/utils';

const props = defineProps<{
  name: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  /** MD3 supporting text below the field; the error replaces it when present. */
  hint?: string;
  /** When set, the textarea is capped and a character counter shows (n/max). */
  maxlength?: number;
}>();

const { value, errorMessage } = useField<string>(toRef(props, 'name'));
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="name" class="text-sm font-medium leading-none">
      {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
    </label>
    <textarea
      :id="name"
      v-model="value"
      :rows="rows ?? 4"
      :maxlength="maxlength"
      :placeholder="placeholder"
      :class="
        cn(
          'flex w-full rounded-sm border border-outline bg-transparent px-4 py-2.5 text-sm placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
          errorMessage && 'border-destructive focus:border-destructive focus:ring-destructive',
        )
      "
    />
    <div class="flex items-start justify-between gap-4">
      <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
      <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
      <span v-if="maxlength" class="ml-auto shrink-0 text-xs tabular-nums text-on-surface-variant">
        {{ value?.length ?? 0 }}/{{ maxlength }}
      </span>
    </div>
  </div>
</template>
