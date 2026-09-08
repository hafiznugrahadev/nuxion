import type { Readable } from 'node:stream';

/** A dump file that can be restored. */
export interface BackupObject {
  /** Full object key / path, relative to the bucket (or the local backup dir). */
  key: string;
  /** Last path segment — what the CLI shows in a listing. */
  name: string;
  size: number;
  lastModified: Date;
}

/** A "folder" within the bucket (an S3 common prefix, or a real dir locally). */
export interface BackupDirectory {
  /** Full prefix INCLUDING the trailing slash, e.g. `postgres/2026-07/`. */
  prefix: string;
  /** Last segment, without the slash — what the CLI shows. */
  name: string;
}

/** One level of the tree: what lives directly under `prefix`. */
export interface BackupListing {
  prefix: string;
  directories: BackupDirectory[];
  /** Dump files, newest-first. */
  files: BackupObject[];
}

export interface BackupStorage {
  /** One level only (folders + dump files) — drives the interactive browser. */
  list(prefix?: string): Promise<BackupListing>;
  /** Every dump file under `prefix`, recursively, newest-first — drives `--latest`. */
  listAll(prefix?: string): Promise<BackupObject[]>;
  download(key: string): Promise<Readable>;
}

/**
 * Dump extensions we offer for restore — plain SQL, optionally gzipped, since
 * that's what `pg_dump | gzip` (Dokploy's backup job) produces and what `psql`
 * can replay. Custom-format dumps (`.dump`, needing `pg_restore`) are out of
 * scope. Anything else is hidden from listings.
 */
export const BACKUP_FILE_EXTENSIONS = ['.sql.gz', '.sql', '.gz'] as const;

export function isBackupFile(key: string): boolean {
  const lower = key.toLowerCase();
  return BACKUP_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
