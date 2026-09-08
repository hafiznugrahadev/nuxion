/**
 * Pure-ish helpers behind `scripts/db-restore.ts` — arg parsing, formatting, and
 * the interactive bucket browser. They live under `src/` (not `scripts/`) so Jest
 * (rootDir: src) can exercise them; all IO is injected, so the tests need neither
 * a bucket nor a TTY.
 */
import { normalizePrefix } from './backup-storage.service';
import type { BackupListing, BackupObject } from './backup-storage.types';

export interface RestoreArgs {
  /** Positional: an exact object key to restore, skipping selection entirely. */
  key?: string;
  /** Folder to start browsing in (or to search under with `--latest`). */
  path?: string;
  latest: boolean;
  force: boolean;
  yes: boolean;
}

export function parseRestoreArgs(argv: string[]): RestoreArgs {
  const args: RestoreArgs = { latest: false, force: false, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--latest') args.latest = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--yes' || arg === '-y') args.yes = true;
    else if (arg === '--path') {
      const value = argv[++i];
      if (value === undefined) throw new Error('--path requires a value.');
      args.path = value;
    } else if (arg.startsWith('--path=')) args.path = arg.slice('--path='.length);
    else if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    else if (args.key === undefined) args.key = arg;
    else throw new Error(`Unexpected argument: ${arg}`);
  }
  return args;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export const formatDate = (date: Date): string => date.toISOString().slice(0, 16).replace('T', ' ');

/** What a numbered menu row does when picked. */
export type BrowseEntry =
  | { kind: 'up' }
  | { kind: 'dir'; prefix: string; label: string }
  | { kind: 'file'; key: string; label: string };

/** Builds the numbered menu for one directory level. Order = display order. */
export function buildMenu(listing: BackupListing): BrowseEntry[] {
  const entries: BrowseEntry[] = [];
  if (listing.prefix) entries.push({ kind: 'up' });
  for (const dir of listing.directories) {
    entries.push({ kind: 'dir', prefix: dir.prefix, label: `${dir.name}/` });
  }
  for (const file of listing.files) {
    entries.push({ kind: 'file', key: file.key, label: describeFile(file) });
  }
  return entries;
}

export const describeFile = (file: BackupObject): string =>
  `${file.name}  ${formatBytes(file.size)}  ${formatDate(file.lastModified)}`;

/** Prefix one level up: `postgres/2026-07/` → `postgres/`. */
export const parentPrefix = (prefix: string): string => prefix.replace(/[^/]+\/$/, '');

export interface BrowseDeps {
  list(prefix: string): Promise<BackupListing>;
  ask(question: string): Promise<string>;
  print(line: string): void;
}

/**
 * Interactive folder browser: walks the bucket one level at a time so the
 * operator can reach any path at run time, instead of the folder being pinned in
 * env. Returns the chosen dump key, or null when the operator quits.
 */
export async function browseForBackup(deps: BrowseDeps, startPrefix = ''): Promise<string | null> {
  let prefix = normalizePrefix(startPrefix);

  for (;;) {
    const listing = await deps.list(prefix);
    const entries = buildMenu(listing);

    deps.print(`\n/${listing.prefix}`);
    entries.forEach((entry, index) => {
      const label = entry.kind === 'up' ? '.. (kembali)' : entry.label;
      deps.print(`  ${index + 1}) ${label}`);
    });
    if (entries.length === 0) deps.print('  (kosong — tidak ada folder atau dump di sini)');

    const answer = (await deps.ask(`Pilih [1-${entries.length}, /path, q]: `)).trim();
    if (answer === '' || answer === 'q') return null;
    // An absolute path jumps straight there — faster than stepping down level by level.
    if (answer.startsWith('/')) {
      prefix = normalizePrefix(answer);
      continue;
    }

    const choice = entries[Number(answer) - 1];
    if (!choice) {
      deps.print('Pilihan tidak valid.');
      continue;
    }
    if (choice.kind === 'file') return choice.key;
    prefix = choice.kind === 'up' ? parentPrefix(prefix) : choice.prefix;
  }
}
