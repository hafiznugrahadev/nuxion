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
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template #default="{ describedBy, invalid }">
      <input
        :id="name"
        v-model="value"
        type="date"
        :min="min"
        :max="max"
        :aria-describedby="describedBy"
        :aria-invalid="invalid"
        :class="
          cn(
            'flex h-10 w-full rounded-sm border border-outline bg-transparent px-4 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            errorMessage && 'border-destructive focus:border-destructive focus:ring-destructive',
          )
        "
      />
    </template>
  </Fieldset>
</template>
