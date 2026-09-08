import { beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, writeFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BackupStorageService,
  normalizePrefix,
  type BackupStorageOptions,
} from './backup-storage.service';
import { isBackupFile } from './backup-storage.types';

const options = (overrides: Partial<BackupStorageOptions> = {}): BackupStorageOptions => ({
  driver: 'local',
  local: { dir: './storage/backups' },
  s3: { region: 'us-east-1', forcePathStyle: true, prefix: '' },
  ...overrides,
});

describe('normalizePrefix', () => {
  it.each([
    [undefined, ''],
    ['', ''],
    ['postgres', 'postgres/'],
    ['postgres/', 'postgres/'],
    ['/postgres/2026-07', 'postgres/2026-07/'],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizePrefix(input)).toBe(expected);
  });
});

describe('isBackupFile', () => {
  it('accepts plain and gzipped SQL dumps', () => {
    expect(isBackupFile('daily.sql.gz')).toBe(true);
    expect(isBackupFile('daily.SQL')).toBe(true);
    expect(isBackupFile('daily.gz')).toBe(true);
  });

  it('hides everything else so non-restorable objects never appear in a menu', () => {
    expect(isBackupFile('notes.txt')).toBe(false);
    expect(isBackupFile('custom.dump')).toBe(false);
    expect(isBackupFile('postgres/')).toBe(false);
  });
});

describe('assertConfigured', () => {
  it('names every missing S3 var at once', () => {
    const service = new BackupStorageService(options({ driver: 's3' }));
    expect(() => service.assertConfigured()).toThrow(
      /BACKUP_S3_BUCKET, BACKUP_S3_ACCESS_KEY_ID, BACKUP_S3_SECRET_ACCESS_KEY/,
    );
  });

  it('passes for a fully configured bucket', () => {
    const service = new BackupStorageService(
      options({
        driver: 's3',
        s3: {
          region: 'us-east-1',
          forcePathStyle: true,
          prefix: '',
          bucket: 'backups',
          accessKeyId: 'key',
          secretAccessKey: 'secret',
        },
      }),
    );
    expect(() => service.assertConfigured()).not.toThrow();
  });

  it('needs no credentials on the local driver', () => {
    expect(() => new BackupStorageService(options()).assertConfigured()).not.toThrow();
  });
});

describe('BackupStorageService (local driver)', () => {
  let dir: string;
  let service: BackupStorageService;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'backup-test-'));
    await mkdir(join(dir, 'postgres'), { recursive: true });
    await writeFile(join(dir, 'root.sql.gz'), 'x');
    await writeFile(join(dir, 'README.txt'), 'not a dump');
    await writeFile(join(dir, 'postgres', 'old.sql.gz'), 'x');
    await writeFile(join(dir, 'postgres', 'new.sql.gz'), 'x');
    // Pin mtimes so the newest-first ordering assertions are deterministic.
    await utimes(join(dir, 'root.sql.gz'), new Date('2026-03-01'), new Date('2026-03-01'));
    await utimes(
      join(dir, 'postgres', 'old.sql.gz'),
      new Date('2026-01-01'),
      new Date('2026-01-01'),
    );
    await utimes(
      join(dir, 'postgres', 'new.sql.gz'),
      new Date('2026-07-20'),
      new Date('2026-07-20'),
    );
    service = new BackupStorageService(options({ local: { dir } }));
  });

  it('lists one level: folders plus dump files, hiding non-dumps', async () => {
    const listing = await service.list();
    expect(listing.directories.map((d) => d.prefix)).toEqual(['postgres/']);
    expect(listing.files.map((f) => f.name)).toEqual(['root.sql.gz']);
  });

  it('lists a nested prefix newest-first', async () => {
    const listing = await service.list('postgres');
    expect(listing.prefix).toBe('postgres/');
    expect(listing.files.map((f) => f.name)).toEqual(['new.sql.gz', 'old.sql.gz']);
    expect(listing.files[0].key).toBe('postgres/new.sql.gz');
  });

  it('listAll recurses across folders, newest-first', async () => {
    const all = await service.listAll();
    expect(all.map((f) => f.key)).toEqual([
      'postgres/new.sql.gz',
      'root.sql.gz',
      'postgres/old.sql.gz',
    ]);
  });

  it('refuses to escape the backup directory', async () => {
    await expect(service.list('../..')).rejects.toThrow(/outside the backup directory/);
    await expect(service.download('../../etc/passwd')).rejects.toThrow(
      /outside the backup directory/,
    );
  });

  it('gives an actionable error when the directory is missing', async () => {
    const missing = new BackupStorageService(options({ local: { dir: join(dir, 'nope') } }));
    await expect(missing.list()).rejects.toThrow(/BACKUP_LOCAL_DIR/);
  });
});
