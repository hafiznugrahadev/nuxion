import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

export interface TableColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Opt the column into header-click sorting (server- or client-driven —
   * the table only reports, it never reorders rows itself). */
  sortable?: boolean;
}

export interface SortState {
  key: string;
  order: 'asc' | 'desc';
}

/**
 * The reusable MD3 data table (port of the Nuxt variant's ui/Table.vue) —
 * deliberately BARE: no card wrapper, no title, page-level chrome belongs to
 * PageHeading. Sorting stays a pure view: onSort reports the click, the caller
 * refetches (the API is the source of truth); bind the current state back so
 * the arrow reflects reality, including the first load with server defaults.
 * Cell content comes via the `cells` render map keyed by column key.
 */
export function Table<T extends object>({
  columns,
  rows,
  rowKey = 'id',
  sort,
  onSort,
  cells,
  className,
}: {
  columns: TableColumn[];
  rows: T[];
  rowKey?: string;
  sort?: SortState | null;
  onSort?: (state: SortState) => void;
  cells?: Partial<Record<string, (row: T, value: unknown) => ReactNode>>;
  className?: string;
}) {
  function toggleSort(col: TableColumn) {
    if (!col.sortable || !onSort) return;
    // Active column flips direction; a new column starts ascending (matches
    // the API default of newest-first when the caller maps createdAt → desc).
    const order: 'asc' | 'desc' = sort?.key === col.key && sort.order === 'asc' ? 'desc' : 'asc';
    onSort({ key: col.key, order });
  }

  const ariaSort = (col: TableColumn) =>
    col.sortable
      ? sort?.key === col.key
        ? sort.order === 'asc'
          ? 'ascending'
          : 'descending'
        : 'none'
      : undefined;

  const cellOf = (row: T, key: string): unknown => (row as Record<string, unknown>)[key];
  const keyOf = (row: T, i: number) => String(cellOf(row, rowKey) ?? i);

  return (
    <div className={cn('w-full', className)}>
      <div className="w-full overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead>
            <tr className="border-y border-outline-variant">
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={ariaSort(col)}
                  className={cn(
                    'px-4 py-3 text-xs font-medium text-on-surface-variant',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      className="touch-target group relative inline-flex items-center gap-1 rounded-sm font-medium text-on-surface-variant transition-colors hover:text-foreground [--touch-slop:-4px]"
                      onClick={() => toggleSort(col)}
                    >
                      {col.label}
                      {sort?.key === col.key ? (
                        sort.order === 'asc' ? (
                          <ArrowUp size={14} aria-hidden="true" />
                        ) : (
                          <ArrowDown size={14} aria-hidden="true" />
                        )
                      ) : (
                        <ChevronsUpDown
                          size={14}
                          className="opacity-0 transition-opacity group-hover:opacity-60"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((row, i) => (
              <tr key={keyOf(row, i)} className="transition-colors hover:bg-on-surface/8">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3.5 text-on-surface',
                      col.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {cells?.[col.key]?.(row, cellOf(row, col.key)) ??
                      String(cellOf(row, col.key) ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
