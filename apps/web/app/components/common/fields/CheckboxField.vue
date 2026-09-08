<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';

const props = defineProps<{
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<boolean>(toRef(props, 'name'));
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center gap-2">
      <Checkbox :id="name" v-model="value" />
      <label
        v-if="label"
        :for="name"
        class="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
      </label>
    </div>
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
    <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
  </div>
</template>
