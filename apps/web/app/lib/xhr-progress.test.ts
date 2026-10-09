import { describe, expect, it } from 'vitest';
import { xhrPending, xhrProgressEnd, xhrProgressStart } from './xhr-progress';

// Module singleton — tests run in order within the file, each leaving 0 behind.
describe('xhr progress counter', () => {
  it('reference-counts concurrent instrumented XHRs', () => {
    expect(xhrPending.value).toBe(0);
    xhrProgressStart();
    xhrProgressStart();
    expect(xhrPending.value).toBe(2);
    xhrProgressEnd();
    expect(xhrPending.value).toBe(1);
    xhrProgressEnd();
    expect(xhrPending.value).toBe(0);
  });

  it('never dips below zero on unpaired ends', () => {
    xhrProgressEnd();
    expect(xhrPending.value).toBe(0);
  });
});
