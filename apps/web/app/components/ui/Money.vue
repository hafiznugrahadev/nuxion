<script setup lang="ts">
import { formatMoney, type MoneyFormatOptions } from '~/lib/money';

const props = withDefaults(
  defineProps<MoneyFormatOptions & { value: number | null | undefined }>(),
  {
    locale: 'id-ID',
    currency: 'IDR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);
</script>

<template>
  <span>{{ formatMoney(value, props) }}</span>
</template>
