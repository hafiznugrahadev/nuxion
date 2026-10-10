<script setup lang="ts">
import { useField } from 'vee-validate';
import { toRef, computed } from 'vue';
import { cn } from '~/lib/utils';
import {
  TagsInputRoot,
  TagsInputItem,
  TagsInputItemText,
  TagsInputItemDelete,
  TagsInputInput,
} from 'reka-ui';

const props = defineProps<{
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}>();

const { value, errorMessage } = useField<string[]>(toRef(props, 'name'));

const tags = computed({
  get: () => value.value ?? [],
  set: (v: string[]) => {
    value.value = v;
  },
});
</script>

<template>
  <Fieldset :name="name" :label="label" :required="required" :error="errorMessage" :hint="hint">
    <template #default="{ id, describedBy, invalid }">
      <TagsInputRoot
        v-model="tags"
        :aria-invalid="invalid"
        :aria-describedby="describedBy"
        :class="
          cn(
            'flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-sm border border-outline bg-transparent px-4 py-1.5 text-sm transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
            errorMessage &&
              'border-destructive focus-within:border-destructive focus-within:ring-destructive',
          )
        "
      >
        <TagsInputItem
          v-for="tag in tags"
          :key="tag"
          :value="tag"
          class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
        >
          <TagsInputItemText />
          <TagsInputItemDelete
            class="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <AppIcon name="close" :size="14" />
          </TagsInputItemDelete>
        </TagsInputItem>
        <TagsInputInput
          :id="id"
          :aria-describedby="describedBy"
          :aria-invalid="invalid"
          :placeholder="tags.length ? '' : (placeholder ?? 'Add tag…')"
          class="flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/85"
        />
      </TagsInputRoot>
    </template>
  </Fieldset>
</template>
