import { describe, expect, it } from 'vitest';
import {
  getXhrPending,
  subscribeXhrPending,
  xhrProgressEnd,
  xhrProgressStart,
} from './xhr-progress';

describe('xhr-progress counter', () => {
  it('reference-counts concurrent requests', () => {
    const before = getXhrPending();
    xhrProgressStart();
    xhrProgressStart();
    expect(getXhrPending()).toBe(before + 2);
    xhrProgressEnd();
    xhrProgressEnd();
    expect(getXhrPending()).toBe(before);
  });

  it('never drops below zero', () => {
    xhrProgressEnd();
    expect(getXhrPending()).toBe(0);
  });

  it('notifies subscribers on change', () => {
    const events: number[] = [];
    const unsubscribe = subscribeXhrPending(() => events.push(getXhrPending()));
    xhrProgressStart();
    xhrProgressEnd();
    unsubscribe();
    expect(events).toEqual([1, 0]);
  });
});
