import { describe, expect, it } from 'vitest';
import { browseForBackup, formatBytes, parseRestoreArgs } from './restore-cli';
import type { BackupListing } from './backup-storage.types';

describe('parseRestoreArgs', () => {
  it('defaults to interactive mode with no flags', () => {
    expect(parseRestoreArgs([])).toEqual({ latest: false, force: false, yes: false });
  });

  it('reads a positional key', () => {
    expect(parseRestoreArgs(['postgres/daily.sql.gz']).key).toBe('postgres/daily.sql.gz');
  });

  it('reads --path in both forms', () => {
    expect(parseRestoreArgs(['--path', 'postgres/']).path).toBe('postgres/');
    expect(parseRestoreArgs(['--path=postgres/']).path).toBe('postgres/');
  });

  it('reads the boolean flags', () => {
    const args = parseRestoreArgs(['--latest', '--force', '-y']);
    expect(args).toMatchObject({ latest: true, force: true, yes: true });
  });

  it('rejects unknown options and stray positionals', () => {
    expect(() => parseRestoreArgs(['--nope'])).toThrow('Unknown option: --nope');
    expect(() => parseRestoreArgs(['a', 'b'])).toThrow('Unexpected argument: b');
    expect(() => parseRestoreArgs(['--path'])).toThrow('--path requires a value');
  });
});

describe('formatBytes', () => {
  it.each([
    [512, '512 B'],
    [2048, '2.0 KB'],
    [5 * 1024 * 1024, '5.0 MB'],
    [3 * 1024 ** 3, '3.0 GB'],
  ])('formats %i as %s', (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe('browseForBackup', () => {
  const tree: Record<string, BackupListing> = {
    '': {
      prefix: '',
      directories: [{ prefix: 'postgres/', name: 'postgres' }],
      files: [
        { key: 'root.sql.gz', name: 'root.sql.gz', size: 10, lastModified: new Date('2026-07-01') },
      ],
    },
    'postgres/': {
      prefix: 'postgres/',
      directories: [],
      files: [
        {
          key: 'postgres/daily.sql.gz',
          name: 'daily.sql.gz',
          size: 20,
          lastModified: new Date('2026-07-20'),
        },
      ],
    },
  };

  const deps = (answers: string[]) => {
    const printed: string[] = [];
    const queue = [...answers];
    return {
      printed,
      list: (prefix: string) => Promise.resolve(tree[prefix]),
      ask: () => Promise.resolve(queue.shift() ?? 'q'),
      print: (line: string) => printed.push(line),
    };
  };

  it('descends into a folder and returns the picked key', async () => {
    // Root menu: 1) postgres/  2) root.sql.gz → pick the dir, then its only file.
    await expect(browseForBackup(deps(['1', '2']))).resolves.toBe('postgres/daily.sql.gz');
  });

  it('offers ".." inside a folder and walks back up', async () => {
    // In postgres/: 1) ..  2) daily.sql.gz. Go up, then pick root.sql.gz (2 at root).
    await expect(browseForBackup(deps(['1', '2']), 'postgres/')).resolves.toBe('root.sql.gz');
  });

  it('starts at the given prefix', async () => {
    await expect(browseForBackup(deps(['2']), 'postgres')).resolves.toBe('postgres/daily.sql.gz');
  });

  it('jumps to a typed absolute path', async () => {
    await expect(browseForBackup(deps(['/postgres', '2']))).resolves.toBe('postgres/daily.sql.gz');
  });

  it('re-prompts on an invalid choice instead of picking something', async () => {
    const d = deps(['99', '1', '2']);
    await expect(browseForBackup(d)).resolves.toBe('postgres/daily.sql.gz');
    expect(d.printed).toContain('Pilihan tidak valid.');
  });

  it('returns null when the operator quits', async () => {
    await expect(browseForBackup(deps(['q']))).resolves.toBeNull();
    await expect(browseForBackup(deps(['']))).resolves.toBeNull();
  });
});
