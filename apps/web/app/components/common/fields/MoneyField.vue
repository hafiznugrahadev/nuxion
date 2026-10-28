<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';
const props = defineProps<{
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  min?: number;
  max?: number;
  allowNegative?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
}>();
const { value, errorMessage } = useField<number | null>(toRef(props, 'name'));
</script>

<template>
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template #default="{ id, describedBy, invalid }">
      <MoneyInput
        :id="id"
        v-model="value"
        :locale="locale"
        :currency="currency"
        :minimum-fraction-digits="minimumFractionDigits"
        :maximum-fraction-digits="maximumFractionDigits"
        :min="min"
        :max="max"
        :allow-negative="allowNegative"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :aria-describedby="describedBy"
        :aria-invalid="invalid"
      />
    </template>
  </Fieldset>
</template>
