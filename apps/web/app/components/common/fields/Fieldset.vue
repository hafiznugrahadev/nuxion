<script setup lang="ts">
import { computed, useId } from 'vue';

/**
 * Presentation-only field skeleton: label + control slot + error/hint.
 * The error is passed in (vee-validate `errorMessage` from the *Field wrappers,
 * `errors.<name>` from a manual `useForm`) — this component never validates.
 * Slot props `{ id, labelId, describedBy, invalid }` wire the control's
 * `:id` / `:aria-labelledby` / `:aria-describedby` / `:aria-invalid`.
 */
const props = defineProps<{
  /** Field name; becomes the control id so label[for] matches it. */
  name?: string;
  label?: string;
  required?: boolean;
  error?: string;
  /** MD3 supporting text below the field; the error replaces it when present. */
  hint?: string;
  /** Group controls (radio group) have no labelable element: render the caption as a span wired via aria-labelledby instead of label[for]. */
  group?: boolean;
}>();

const uid = useId();
const inputId = computed(() => props.name ?? uid);
const labelId = computed(() => `${inputId.value}-label`);
const errorId = computed(() => `${inputId.value}-error`);
const hintId = computed(() => `${inputId.value}-hint`);
const describedBy = computed(() =>
  props.error ? errorId.value : props.hint ? hintId.value : undefined,
);
const invalid = computed(() => !!props.error);
</script>

<template>
  <div class="space-y-1.5">
    <component
      :is="group ? 'span' : 'label'"
      v-if="label || $slots.label"
      :id="labelId"
      :for="group ? undefined : inputId"
      class="text-sm font-medium leading-none"
    >
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="ml-0.5 text-destructive">*</span>
    </component>
    <slot :id="inputId" :label-id="labelId" :described-by="describedBy" :invalid="invalid" />
    <div v-if="error || hint || $slots.trailing" class="flex items-start justify-between gap-4">
      <p v-if="error" :id="errorId" class="text-xs text-destructive">{{ error }}</p>
      <p v-else-if="hint" :id="hintId" class="text-xs text-on-surface-variant">{{ hint }}</p>
      <slot name="trailing" />
    </div>
  </div>
</template>
