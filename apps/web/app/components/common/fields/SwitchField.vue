<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef } from 'vue';
import { SwitchRoot, SwitchThumb } from 'reka-ui';

const props = defineProps<{
  name: string;
  label?: string;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<boolean>(toRef(props, 'name'));
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex items-center gap-3">
      <!-- MD3 switch: 52x32 track, on = primary/on-primary thumb, off =
           surface-container-highest track with an outline thumb. -->
      <SwitchRoot
        :id="name"
        v-model="value"
        class="peer inline-flex h-8 w-[52px] shrink-0 cursor-pointer items-center rounded-full border-2 transition-colors duration-200 ease-emphasized focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=unchecked]:border-outline data-[state=unchecked]:bg-surface-container-highest"
      >
        <SwitchThumb
          class="pointer-events-none block h-6 w-6 rounded-full transition-transform duration-200 ease-emphasized data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 data-[state=checked]:bg-on-primary data-[state=unchecked]:bg-outline"
        />
      </SwitchRoot>
      <label
        v-if="label"
        :for="name"
        class="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
      </label>
    </div>
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
    <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
  </div>
</template>
