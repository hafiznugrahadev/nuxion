import { format } from 'date-fns';

/** Auto-imported pure helpers (SPEC: utils/ are auto-imported). */
export function formatDate(value: string | Date): string {
  return format(new Date(value), 'dd MMM yyyy');
}

export function timeRange(start: string, end: string): string {
  return `${start} – ${end}`;
}
