<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef, ref } from 'vue';
import { cn } from '~/lib/utils';

const props = defineProps<{
  name: string;
  label?: string;
  placeholder?: string;
  accept?: string;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<File | undefined>(toRef(props, 'name'));
const inputRef = ref<HTMLInputElement | null>(null);

function onFileChange(e: Event) {
  value.value = (e.target as HTMLInputElement).files?.[0] ?? undefined;
}

function clear() {
  value.value = undefined;
  if (inputRef.value) inputRef.value.value = '';
}
</script>

<template>
  <div class="space-y-1.5">
    <label v-if="label" :for="name" class="text-sm font-medium leading-none">
      {{ label }}<span v-if="required" class="ml-0.5 text-destructive">*</span>
    </label>
    <!-- MD3 outlined field with an inner tonal button (m-1 / h-8 inside the
         h-10 container, like a text-field trailing control). -->
    <div
      :class="
        cn(
          'flex h-10 w-full items-center rounded-sm border border-outline bg-transparent text-sm transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
          errorMessage &&
            'border-destructive focus-within:border-destructive focus-within:ring-destructive',
        )
      "
    >
      <button
        type="button"
        class="state-layer relative m-1 flex h-8 shrink-0 items-center gap-1.5 rounded-sm bg-secondary px-3 text-xs font-medium text-secondary-foreground"
        @click="inputRef?.click()"
      >
        <MaterialSymbol name="attach_file" :size="16" />
        Choose file
      </button>
      <span
        class="flex-1 truncate px-3"
        :class="value ? 'text-foreground' : 'text-muted-foreground'"
      >
        {{ value?.name ?? placeholder ?? 'No file chosen' }}
      </span>
      <button
        v-if="value"
        type="button"
        class="touch-target relative mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-on-surface-variant/10 hover:text-foreground [--touch-slop:-4px]"
        aria-label="Remove file"
        @click="clear"
      >
        <MaterialSymbol name="close" :size="18" />
      </button>
    </div>
    <input
      :id="name"
      ref="inputRef"
      type="file"
      class="sr-only"
      :accept="accept"
      @change="onFileChange"
    />
    <p v-if="errorMessage" class="text-xs text-destructive">{{ errorMessage }}</p>
    <p v-else-if="hint" class="text-xs text-on-surface-variant">{{ hint }}</p>
  </div>
</template>
