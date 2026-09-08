<script setup lang="ts">
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from 'reka-ui';
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

export interface DropdownMenuItemDef {
  label: string;
  /** Material Symbols name. */
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * MD3 menu on a trigger slot: surface-container-high, 8dp corners, level-2
 * elevation, state-layer hover on items, optional section label + dividers.
 */
const props = defineProps<{
  items: DropdownMenuItemDef[];
  label?: string;
  class?: HTMLAttributes['class'];
}>();
const emit = defineEmits<{ select: [item: DropdownMenuItemDef] }>();

const open = defineModel<boolean>('open', { default: undefined });
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger as-child><slot /></DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        align="start"
        :side-offset="6"
        :class="
          cn(
            'z-50 min-w-48 rounded-md bg-surface-container-high p-1.5 shadow-theme-md',
            props.class,
          )
        "
      >
        <DropdownMenuLabel
          v-if="label"
          class="px-3 pb-1 pt-1.5 text-xs font-medium text-on-surface-variant"
        >
          {{ label }}
        </DropdownMenuLabel>
        <DropdownMenuItem
          v-for="item in items"
          :key="item.label"
          :disabled="item.disabled"
          class="flex cursor-pointer select-none items-center gap-2.5 rounded-sm px-3 py-2 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-on-surface-variant/10"
          :class="item.danger ? 'text-error data-[highlighted]:bg-error/10' : 'text-on-surface'"
          @select="emit('select', item)"
        >
          <MaterialSymbol v-if="item.icon" :name="item.icon" :size="18" />
          {{ item.label }}
        </DropdownMenuItem>
        <DropdownMenuSeparator v-if="$slots.footer" class="my-1 h-px bg-outline-variant" />
        <slot name="footer" />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
