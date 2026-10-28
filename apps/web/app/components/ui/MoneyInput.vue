<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { cn } from '~/lib/utils';
import { formatMoney, formatMoneyEdit, parseMoneyInput } from '~/lib/money';

const props = withDefaults(
  defineProps<{
    id?: string;
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    min?: number;
    max?: number;
    allowNegative?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    placeholder?: string;
    class?: string;
  }>(),
  {
    id: undefined,
    locale: 'id-ID',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    allowNegative: true,
    min: undefined,
    max: undefined,
    placeholder: undefined,
    class: undefined,
  },
);
const model = defineModel<number | null>({ default: null });
const focused = ref(false);
const draft = ref('');
const displayValue = computed(() => {
  if (focused.value) return draft.value;
  return formatMoney(model.value, props);
});

watch(model, (value) => {
  if (focused.value && parseMoneyInput(draft.value, props.locale) !== value)
    draft.value = formatMoneyEdit(value, props.locale);
});

function beginEdit() {
  focused.value = true;
  draft.value = formatMoneyEdit(model.value, props.locale);
}

function updateValue(event: Event) {
  const input = event.target as HTMLInputElement;
  draft.value = input.value;
  const parsed = parseMoneyInput(input.value, props.locale);
  model.value =
    parsed == null
      ? null
      : Math.min(
          props.max ?? Infinity,
          Math.max(props.min ?? -Infinity, props.allowNegative ? parsed : Math.max(0, parsed)),
        );
}

function endEdit() {
  focused.value = false;
  if (!draft.value.trim()) model.value = null;
}
</script>

<template>
  <input
    :id="id"
    :value="displayValue"
    type="text"
    inputmode="decimal"
    autocomplete="off"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :class="
      cn(
        'h-10 w-full rounded-sm border border-outline bg-transparent px-4 text-sm text-foreground placeholder:text-on-surface-variant/85 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @focus="beginEdit"
    @input="updateValue"
    @blur="endEdit"
  />
</template>
