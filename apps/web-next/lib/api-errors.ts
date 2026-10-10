import type { ApiErrorResponse } from '@nuxion/shared-types';

export class ApiError extends Error {
  readonly data: ApiErrorResponse;

  constructor(data: ApiErrorResponse) {
    super(Array.isArray(data.message) ? data.message.join(', ') : data.message);
    this.name = 'ApiError';
    this.data = data;
  }
}

/** Both fetch failures and errors thrown while unwrapping expose the envelope as data. */
export function apiFieldErrors(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object') return {};
  const data = 'data' in error ? error.data : error;
  if (!data || typeof data !== 'object' || !('fieldErrors' in data)) return {};
  const fields = data.fieldErrors;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  const result: Record<string, string> = {};
  for (const [field, value] of Object.entries(fields)) {
    const messages = Array.isArray(value) ? value : [value];
    const message = messages.filter((item): item is string => typeof item === 'string').join(', ');
    if (message) result[field] = message;
  }
  return result;
}

/** Bind only explicit API field names that belong to this form. General failures stay general. */
export function applyApiFieldErrors(
  error: unknown,
  setErrors: (errors: Record<string, string>) => void,
  fields: readonly string[],
): boolean {
  const errors = apiFieldErrors(error);
  const selected: Record<string, string> = {};
  for (const field of fields) {
    if (Object.hasOwn(errors, field)) selected[field] = errors[field]!;
  }
  if (!Object.keys(selected).length) return false;
  setErrors(selected);
  return true;
}
