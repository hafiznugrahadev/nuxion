<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';
import { RadioGroupRoot, RadioGroupItem, RadioGroupIndicator } from 'reka-ui';

const props = defineProps<{
  name: string;
  label?: string;
  options: { label: string; value: string }[];
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<string>(toRef(props, 'name'));
</script>

<template>
  <div class="space-y-1.5">
    <span v-if="label" class="text-sm font-medium leading-none">
      {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
    </span>
    <RadioGroupRoot v-model="value" class="flex flex-col gap-1">
      <!-- Full-row labels give each option a 48dp hit area (M3 target size). -->
      <label
        v-for="opt in options"
        :key="opt.value"
        :for="`${name}-${opt.value}`"
        class="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm px-1 py-1 transition-colors hover:bg-on-surface/4"
      >
        <RadioGroupItem
          :id="`${name}-${opt.value}`"
          :value="opt.value"
          class="aspect-square h-5 w-5 shrink-0 rounded-full border-2 border-outline text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary"
        >
          <RadioGroupIndicator class="flex items-center justify-center">
            <div class="h-2.5 w-2.5 rounded-full bg-primary" />
          </RadioGroupIndicator>
        </RadioGroupItem>
        <span class="text-sm leading-none">{{ opt.label }}</span>
      </label>
    </RadioGroupRoot>
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
    <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
  </div>
</template>
