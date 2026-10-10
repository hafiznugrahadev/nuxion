<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';
import { cn } from '~/lib/utils';

/**
 * SPEC DRY #2 (FE) — label + input + error, integrated via VeeValidate `useField`.
 * Must be used inside a VeeValidate form (`useForm` / `<Form>`).
 */
const props = defineProps<{
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  /** Lucide icon name for a leading glyph (e.g. 'lock'). */
  prefixIcon?: string;
  /** MD3 supporting text below the field; the error replaces it when present. */
  hint?: string;
  /** HTML inputmode hint (e.g. 'numeric' for OTP entry). */
  inputmode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
  /** Hard character cap (e.g. OTP codes). */
  maxlength?: number;
  disabled?: boolean;
}>();

const { value, errorMessage } = useField<string>(toRef(props, 'name'));
</script>

<template>
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template v-if="$slots.label" #label>
      <slot name="label" />
    </template>
    <template #default="{ describedBy, invalid }">
      <Input
        :id="name"
        v-model="value"
        :type="type ?? 'text'"
        :placeholder="placeholder"
        :prefix-icon="prefixIcon"
        :inputmode="inputmode"
        :maxlength="maxlength"
        :disabled="disabled"
        :aria-describedby="describedBy"
        :aria-invalid="invalid"
        :class="
          cn(errorMessage && 'border-destructive focus:border-destructive focus:ring-destructive')
        "
      />
    </template>
  </Fieldset>
</template>
