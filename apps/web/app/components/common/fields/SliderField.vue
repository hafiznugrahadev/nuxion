<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef, computed } from 'vue';
import { SliderRoot, SliderTrack, SliderRange, SliderThumb } from 'reka-ui';

const props = defineProps<{
  name: string;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<number>(toRef(props, 'name'));

const sliderValue = computed({
  get: () => [value.value ?? props.min ?? 0],
  set: (v: number[]) => {
    value.value = v[0] ?? props.min ?? 0;
  },
});
</script>

<template>
  <Fieldset
    :name="name"
    :label="label"
    :required="required"
    :error="errorMessage"
    :hint="hint"
    group
    label-class="flex items-center justify-between"
  >
    <template #label>
      {{ label }}
      <span class="text-sm tabular-nums text-muted-foreground">{{ value ?? min ?? 0 }}</span>
    </template>
    <template #default="{ id, labelId, describedBy, invalid }">
      <SliderRoot
        v-model="sliderValue"
        :min="min ?? 0"
        :max="max ?? 100"
        :step="step ?? 1"
        class="relative flex w-full touch-none select-none items-center"
      >
        <SliderTrack
          class="relative h-1 w-full grow overflow-hidden rounded-full bg-surface-container-highest"
        >
          <SliderRange class="absolute h-full bg-primary" />
        </SliderTrack>
        <SliderThumb
          :id="id"
          :aria-labelledby="label ? labelId : undefined"
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          class="block h-5 w-5 rounded-full border-0 bg-primary shadow transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderRoot>
    </template>
  </Fieldset>
</template>
