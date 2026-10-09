import { describe, expect, it } from 'vitest';
import { formatDate, timeRange } from './datetime';

describe('formatDate', () => {
  it('formats an ISO string as dd MMM yyyy', () => {
    expect(formatDate('2026-10-04T12:00:00Z')).toBe('04 Oct 2026');
  });

  it('accepts a Date instance', () => {
    expect(formatDate(new Date('2026-01-31T12:00:00Z'))).toBe('31 Jan 2026');
  });
});

describe('timeRange', () => {
  it('joins start and end with an en dash', () => {
    expect(timeRange('09:00', '17:00')).toBe('09:00 – 17:00');
  });
});
