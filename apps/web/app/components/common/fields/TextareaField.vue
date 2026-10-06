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
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template #default="{ describedBy, invalid }">
      <textarea
        :id="name"
        v-model="value"
        :rows="rows ?? 4"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :aria-describedby="describedBy"
        :aria-invalid="invalid"
        :class="
          cn(
            'flex w-full rounded-sm border border-outline bg-transparent px-4 py-2.5 text-sm placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary',
            errorMessage && 'border-destructive focus:border-destructive focus:ring-destructive',
          )
        "
      />
    </template>
    <template v-if="maxlength" #trailing>
      <span class="ml-auto shrink-0 text-xs tabular-nums text-on-surface-variant">
        {{ value?.length ?? 0 }}/{{ maxlength }}
      </span>
    </template>
  </Fieldset>
</template>
