import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { databaseNameFromUrl, DatabaseRestoreService } from './database-restore.service';

describe('databaseNameFromUrl', () => {
  it('extracts the database name without leaking credentials', () => {
    expect(databaseNameFromUrl('postgresql://u:p@host:5432/nuxion?schema=public')).toBe('nuxion');
  });

  it('falls back rather than throwing on a malformed URL', () => {
    expect(databaseNameFromUrl('not-a-url')).toBe('(unknown)');
  });
});

describe('DatabaseRestoreService', () => {
  const input = (overrides: Partial<Parameters<DatabaseRestoreService['restore']>[0]> = {}) => ({
    dump: Readable.from(['-- dump']),
    gzipped: false,
    databaseUrl: 'postgresql://u:p@host:5432/nuxion',
    force: false,
    nodeEnv: 'development',
    ...overrides,
  });

  it('refuses a production restore without --force, before touching the schema', async () => {
    const service = new DatabaseRestoreService();
    const runPsql = vi.spyOn(service as unknown as { runPsql: () => Promise<void> }, 'runPsql');

    await expect(service.restore(input({ nodeEnv: 'production' }))).rejects.toThrow(
      'Refusing to restore in production without --force.',
    );
    expect(runPsql).not.toHaveBeenCalled();
  });

  it('drops and recreates the schema before applying the dump', async () => {
    const service = new DatabaseRestoreService();
    const calls: { args: string[]; hasStdin: boolean }[] = [];
    vi.spyOn(
      service as unknown as {
        runPsql: (url: string, args: string[], stdin?: unknown) => Promise<void>;
      },
      'runPsql',
    ).mockImplementation((_url: string, args: string[], stdin?: unknown) => {
      calls.push({ args, hasStdin: Boolean(stdin) });
      return Promise.resolve();
    });

    await service.restore(input());

    expect(calls).toHaveLength(2);
    expect(calls[0].args).toEqual(['-c', 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;']);
    expect(calls[0].hasStdin).toBe(false);
    // Second call pipes the dump into psql's stdin rather than passing SQL inline.
    expect(calls[1].args).toEqual([]);
    expect(calls[1].hasStdin).toBe(true);
  });

  it('allows a forced production restore', async () => {
    const service = new DatabaseRestoreService();
    vi.spyOn(service as unknown as { runPsql: () => Promise<void> }, 'runPsql').mockResolvedValue(
      undefined,
    );

    await expect(
      service.restore(input({ nodeEnv: 'production', force: true })),
    ).resolves.toBeUndefined();
  });

  it('explains how to install psql when the binary is missing', async () => {
    const service = new DatabaseRestoreService();
    await expect(
      service.restore(input({ databaseUrl: 'postgresql://u:p@127.0.0.1:1/none' })),
    ).rejects.toThrow(/psql/);
  });
});
