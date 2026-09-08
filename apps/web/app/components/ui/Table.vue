<script setup lang="ts" generic="T extends object">
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

/**
 * The reusable MD3 data table — deliberately BARE: no card wrapper, no title,
 * page-level chrome belongs to PageHeading. It sits straight on the page
 * surface (header divider top/bottom, row dividers, state-layer hover).
 *
 * The optional `#heading` slot is for the rare case of multiple tables under
 * one page heading (e.g. two related tables in a single menu) — pass your own
 * markup; by default nothing renders above the table.
 *
 * Cell content defaults to the raw value; override with the `#cell-{key}`
 * slot ({ row, value }). Generic over the row type so typed arrays (e.g.
 * User[]) pass straight through.
 */
const props = defineProps<{
  columns: TableColumn[];
  rows: T[];
  rowKey?: string;
  class?: HTMLAttributes['class'];
}>();

// Cast helper — keeps `<`/`>` out of the template: prettier's HTML tokenizer
// reads `Record<string, unknown>` inside a mustache as a stray opening tag.
const cellOf = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];

const keyOf = (row: T, i: number) => String(cellOf(row, props.rowKey ?? 'id') ?? i);
</script>

<template>
  <div :class="cn('w-full', props.class)">
    <!-- Optional: only for multiple tables under one page heading. -->
    <slot name="heading" />
    <div class="w-full overflow-x-auto">
      <table class="w-full caption-bottom text-sm">
        <thead>
          <tr class="border-y border-outline-variant">
            <th
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3 text-xs font-medium text-on-surface-variant"
              :class="col.align === 'right' ? 'text-right' : 'text-left'"
            >
              {{ col.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-outline-variant">
          <tr
            v-for="(row, i) in rows"
            :key="keyOf(row, i)"
            class="transition-colors hover:bg-on-surface/8"
          >
            <td
              v-for="col in columns"
              :key="col.key"
              class="px-4 py-3.5 text-on-surface"
              :class="col.align === 'right' ? 'text-right' : 'text-left'"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="cellOf(row, col.key)">
                {{ cellOf(row, col.key) }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
