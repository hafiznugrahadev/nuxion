import { describe, expect, it } from 'vitest';
import { ApiError, apiFieldErrors, applyApiFieldErrors } from './api-errors';

describe('ApiError', () => {
  it('joins array messages', () => {
    const error = new ApiError({ success: false, message: ['a', 'b'] } as never);
    expect(error.message).toBe('a, b');
  });
});

describe('apiFieldErrors', () => {
  it('reads the envelope from an ApiError', () => {
    const error = new ApiError({
      success: false,
      message: 'err',
      fieldErrors: { email: ['taken'], name: 'required' },
    } as never);
    expect(apiFieldErrors(error)).toEqual({ email: 'taken', name: 'required' });
  });

  it('returns empty for non-envelope errors', () => {
    expect(apiFieldErrors(new Error('boom'))).toEqual({});
    expect(apiFieldErrors(null)).toEqual({});
    expect(apiFieldErrors({ data: { fieldErrors: 'nope' } })).toEqual({});
  });
});

describe('applyApiFieldErrors', () => {
  it('binds only the requested fields and reports whether it bound any', () => {
    const error = new ApiError({
      success: false,
      message: 'err',
      fieldErrors: { email: 'taken', password: 'short' },
    } as never);
    const bound: Record<string, string>[] = [];
    const applied = applyApiFieldErrors(error, (e) => bound.push(e), ['email']);
    expect(applied).toBe(true);
    expect(bound).toEqual([{ email: 'taken' }]);
  });

  it('reports false when no requested field is present', () => {
    const error = new ApiError({
      success: false,
      message: 'err',
      fieldErrors: { password: 'short' },
    } as never);
    const bound: Record<string, string>[] = [];
    expect(applyApiFieldErrors(error, (e) => bound.push(e), ['email'])).toBe(false);
    expect(bound).toEqual([]);
  });
});
