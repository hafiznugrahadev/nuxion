import { vi } from 'vitest';
import type { Database } from '../../src/db/relations';

/** Methods whose first argument carries a persisted payload worth asserting on. */
const CAPTURED = new Set(['set', 'values', 'onConflictDoUpdate']);

/**
 * Minimal stand-in for the injected Drizzle database in unit tests. Builder
 * methods are chainable no-ops; awaiting a chain resolves to the result
 * configured for that verb. Awaited selects consume a queue of row arrays
 * (`setSelectRows` / `thenSelectRows`; the last entry repeats), and payload
 * methods (`.set()` / `.values()` / `.onConflictDoUpdate()`) record their
 * first argument in `calls` so specs can assert what was persisted.
 */
export function mockDb(
  results: { select?: unknown[]; insert?: unknown[]; update?: unknown[] } = {},
) {
  const calls: Partial<Record<'set' | 'values' | 'onConflictDoUpdate', unknown[]>> = {};
  const selectQueue: unknown[][] = [results.select ?? []];

  const make = (value: () => unknown): unknown => {
    const promise = Promise.resolve(value());
    const chain: unknown = new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (prop === 'then' || prop === 'catch' || prop === 'finally') {
            const fn = (promise as unknown as Record<string, unknown>)[prop] as (
              ...a: unknown[]
            ) => unknown;
            return fn.bind(promise);
          }
          return (...args: unknown[]) => {
            if (CAPTURED.has(prop) && args.length > 0) {
              const recorded = calls as Record<string, unknown[]>;
              recorded[prop] ??= [];
              recorded[prop].push(args[0]);
            }
            return chain;
          };
        },
      },
    );
    return chain;
  };

  const db = {
    select: vi.fn(() =>
      make(() => (selectQueue.length > 1 ? selectQueue.shift() : selectQueue[0])),
    ),
    insert: vi.fn(() => make(() => results.insert ?? [])),
    update: vi.fn(() => make(() => results.update ?? [])),
    delete: vi.fn(() => make(() => [])),
  };

  return {
    db: db as unknown as Database,
    calls,
    /** Replace what the next awaited select resolves to. */
    setSelectRows: (rows: unknown[]) => {
      selectQueue.splice(0, selectQueue.length, rows);
    },
    /** Append a result consumed by a subsequent awaited select. */
    thenSelectRows: (rows: unknown[]) => {
      selectQueue.push(rows);
    },
  };
}
