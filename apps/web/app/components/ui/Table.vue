<script setup lang="ts" generic="T extends object">
import type { HTMLAttributes } from 'vue';
import { cn } from '~/lib/utils';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Opt the column into header-click sorting (server- or client-driven —
   * the table only emits, it never reorders rows itself). */
  sortable?: boolean;
}

export interface SortState {
  key: string;
  order: 'asc' | 'desc';
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
 *
 * Sorting: columns with `sortable: true` render as a button header. Clicking
 * toggles asc → desc; clicking another column starts it at asc. The table
 * stays a pure view — it emits `update:sort` and the caller decides what to do
 * (e.g. refetch with `sortBy`/`order` query params). Bind the current state
 * back via `v-model:sort` so the arrow reflects reality, including the first
 * load with server defaults.
 */
const props = defineProps<{
  columns: TableColumn[];
  rows: T[];
  rowKey?: string;
  class?: HTMLAttributes['class'];
  /** Current sort (`null` = unsorted). Part of the `v-model:sort` pair. */
  sort?: SortState | null;
}>();

const emit = defineEmits<{
  'update:sort': [state: SortState];
}>();

function toggleSort(col: TableColumn) {
  if (!col.sortable) return;
  // Active column flips direction; a new column starts ascending (matches the
  // API default of newest-first when the caller maps createdAt → desc first).
  const order: 'asc' | 'desc' =
    props.sort?.key === col.key && props.sort.order === 'asc' ? 'desc' : 'asc';
  emit('update:sort', { key: col.key, order });
}

const ariaSort = (col: TableColumn) =>
  col.sortable
    ? props.sort?.key === col.key
      ? props.sort.order === 'asc'
        ? 'ascending'
        : 'descending'
      : 'none'
    : undefined;

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
              :aria-sort="ariaSort(col)"
              class="px-4 py-3 text-xs font-medium text-on-surface-variant"
              :class="col.align === 'right' ? 'text-right' : 'text-left'"
            >
              <button
                v-if="col.sortable"
                type="button"
                class="touch-target group relative inline-flex items-center gap-1 rounded-sm font-medium text-on-surface-variant transition-colors hover:text-foreground [--touch-slop:-4px]"
                @click="toggleSort(col)"
              >
                {{ col.label }}
                <MaterialSymbol
                  :name="
                    sort?.key === col.key
                      ? sort.order === 'asc'
                        ? 'arrow_upward'
                        : 'arrow_downward'
                      : 'unfold_more'
                  "
                  :size="14"
                  class="transition-opacity"
                  :class="
                    sort?.key === col.key ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
                  "
                />
              </button>
              <template v-else>{{ col.label }}</template>
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
