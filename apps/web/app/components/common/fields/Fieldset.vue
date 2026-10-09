<script setup lang="ts">
import { computed, useId } from 'vue';
import { Field, FieldDescription, FieldError, FieldLabel } from '~/components/ui/field';
import { cn } from '~/lib/utils';

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
  /** Place boolean controls before their caption. */
  inline?: boolean;
  labelClass?: string;
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
  <Field
    orientation="vertical"
    :data-invalid="invalid"
    :aria-labelledby="label || $slots.label ? labelId : undefined"
    class="gap-1.5"
  >
    <div :class="cn('flex', inline ? 'items-center gap-3' : 'flex-col gap-1.5')">
      <slot
        v-if="inline"
        :id="inputId"
        :label-id="labelId"
        :described-by="describedBy"
        :invalid="invalid"
      />
      <FieldLabel
        v-if="label || $slots.label"
        :id="labelId"
        :as="group ? 'span' : 'label'"
        :for="group ? undefined : inputId"
        :class="cn('gap-0', labelClass)"
      >
        <slot name="label">{{ label }}</slot>
        <span v-if="required" class="ml-0.5 text-destructive">*</span>
      </FieldLabel>
      <slot
        v-if="!inline"
        :id="inputId"
        :label-id="labelId"
        :described-by="describedBy"
        :invalid="invalid"
      />
    </div>
    <div v-if="error || hint || $slots.trailing" class="flex items-start justify-between gap-4">
      <FieldError v-if="error" :id="errorId">{{ error }}</FieldError>
      <FieldDescription v-else-if="hint" :id="hintId" class="nth-last-2:mt-0">
        {{ hint }}
      </FieldDescription>
      <slot name="trailing" />
    </div>
  </Field>
</template>
