import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import {
  isBackupFile,
  type BackupDirectory,
  type BackupListing,
  type BackupObject,
  type BackupStorage,
} from './backup-storage.types';

export interface BackupS3Options {
  endpoint?: string;
  region: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
  /** Starting point for browsing; not a hard filter. */
  prefix: string;
}

export interface BackupStorageOptions {
  driver: string;
  local: { dir: string };
  s3: BackupS3Options;
}

/** Structural view of the bits of `@aws-sdk/client-s3` this service uses. */
interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}
interface S3Module {
  S3Client: new (config: unknown) => S3ClientLike;
  ListObjectsV2Command: new (input: unknown) => unknown;
  GetObjectCommand: new (input: unknown) => unknown;
}
interface ListObjectsV2Result {
  Contents?: { Key?: string; Size?: number; LastModified?: Date }[];
  CommonPrefixes?: { Prefix?: string }[];
  NextContinuationToken?: string;
  IsTruncated?: boolean;
}
interface GetObjectResult {
  Body?: Readable;
}

// Held as a `string` (not a literal) so TS treats the AWS SDK as a runtime-only,
// OPTIONAL dependency — `local`-driver deployments never need it. Mirrors
// `storage/drivers/s3.driver.ts`.
const S3_SDK: string = '@aws-sdk/client-s3';

/** Strip leading slashes and normalise a prefix to `''` or `something/`. */
export function normalizePrefix(prefix?: string): string {
  const trimmed = (prefix ?? '').replace(/^\/+/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}

const newestFirst = (a: BackupObject, b: BackupObject): number =>
  b.lastModified.getTime() - a.lastModified.getTime();

const byName = (a: BackupDirectory, b: BackupDirectory): number => a.name.localeCompare(b.name);

/**
 * Lists and downloads database dumps from the backup bucket. Read-only by design:
 * this app never writes backups (Dokploy does). Two drivers — `s3` (RustFS /
 * MinIO / AWS) and `local` (a folder, for dev) — behind one contract.
 *
 * Listing is level-by-level (S3 `Delimiter: '/'`) rather than a flat recursive
 * scan, so the operator can browse into any folder at restore time instead of the
 * path being pinned in env.
 */
export class BackupStorageService implements BackupStorage {
  private clientPromise?: Promise<S3ClientLike>;

  constructor(private readonly opts: BackupStorageOptions) {}

  private get isS3(): boolean {
    return this.opts.driver === 's3';
  }

  /** Throws a CLI-friendly error when the backup storage isn't configured. */
  assertConfigured(): void {
    if (!this.isS3) return;
    const { bucket, accessKeyId, secretAccessKey } = this.opts.s3;
    const missing = [
      !bucket && 'BACKUP_S3_BUCKET',
      !accessKeyId && 'BACKUP_S3_ACCESS_KEY_ID',
      !secretAccessKey && 'BACKUP_S3_SECRET_ACCESS_KEY',
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new Error(
        `Backup storage is not configured — missing ${missing.join(', ')} in .env.\n` +
          'Set the backup bucket credentials, or use BACKUP_DRIVER=local for a local folder.',
      );
    }
  }

  private async sdk(): Promise<S3Module> {
    try {
      return (await import(S3_SDK)) as S3Module;
    } catch {
      throw new Error(
        'BACKUP_DRIVER=s3 requires the "@aws-sdk/client-s3" package. Run: bun add @aws-sdk/client-s3',
      );
    }
  }

  private client(): Promise<S3ClientLike> {
    if (!this.clientPromise) {
      const { region, endpoint, forcePathStyle, accessKeyId, secretAccessKey } = this.opts.s3;
      this.clientPromise = this.sdk().then(
        ({ S3Client }) =>
          new S3Client({
            region,
            endpoint,
            forcePathStyle,
            credentials:
              accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
          }),
      );
    }
    return this.clientPromise;
  }

  /** Every page of a ListObjectsV2 call, so large buckets aren't silently truncated. */
  private async *pages(prefix: string, delimiter?: string): AsyncGenerator<ListObjectsV2Result> {
    const { ListObjectsV2Command } = await this.sdk();
    const client = await this.client();
    let token: string | undefined;
    do {
      const page = (await client.send(
        new ListObjectsV2Command({
          Bucket: this.opts.s3.bucket,
          Prefix: prefix,
          Delimiter: delimiter,
          ContinuationToken: token,
        }),
      )) as ListObjectsV2Result;
      yield page;
      token = page.NextContinuationToken;
    } while (token);
  }

  async list(prefix?: string): Promise<BackupListing> {
    const normalized = normalizePrefix(prefix);
    return this.isS3 ? this.listS3(normalized) : this.listLocal(normalized);
  }

  private async listS3(prefix: string): Promise<BackupListing> {
    const directories: BackupDirectory[] = [];
    const files: BackupObject[] = [];

    for await (const page of this.pages(prefix, '/')) {
      for (const common of page.CommonPrefixes ?? []) {
        if (!common.Prefix) continue;
        directories.push({
          prefix: common.Prefix,
          name: common.Prefix.slice(prefix.length).replace(/\/$/, ''),
        });
      }
      for (const object of page.Contents ?? []) {
        // The prefix itself comes back as a zero-byte "folder marker" — skip it.
        if (!object.Key || object.Key === prefix) continue;
        if (!isBackupFile(object.Key)) continue;
        files.push({
          key: object.Key,
          name: object.Key.slice(prefix.length),
          size: object.Size ?? 0,
          lastModified: object.LastModified ?? new Date(0),
        });
      }
    }

    return { prefix, directories: directories.sort(byName), files: files.sort(newestFirst) };
  }

  private async listLocal(prefix: string): Promise<BackupListing> {
    const root = resolve(this.opts.local.dir);
    const dir = resolve(root, prefix);
    // Guard against `..` escaping the configured backup dir.
    if (dir !== root && !dir.startsWith(`${root}/`)) {
      throw new Error(`Path "${prefix}" is outside the backup directory.`);
    }

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Backup directory not found: ${dir} (set BACKUP_LOCAL_DIR)`, {
          cause: error,
        });
      }
      throw error;
    }

    const directories: BackupDirectory[] = [];
    const files: BackupObject[] = [];
    for (const entry of entries) {
      if (entry.isDirectory()) {
        directories.push({ prefix: `${prefix}${entry.name}/`, name: entry.name });
        continue;
      }
      if (!entry.isFile() || !isBackupFile(entry.name)) continue;
      const stats = await stat(join(dir, entry.name));
      files.push({
        key: `${prefix}${entry.name}`,
        name: entry.name,
        size: stats.size,
        lastModified: stats.mtime,
      });
    }

    return { prefix, directories: directories.sort(byName), files: files.sort(newestFirst) };
  }

  async listAll(prefix?: string): Promise<BackupObject[]> {
    const normalized = normalizePrefix(prefix);
    if (!this.isS3) {
      const listing = await this.listLocal(normalized);
      const nested = await Promise.all(listing.directories.map((d) => this.listAll(d.prefix)));
      return [...listing.files, ...nested.flat()].sort(newestFirst);
    }

    const files: BackupObject[] = [];
    // No delimiter → S3 returns every key under the prefix in one recursive sweep.
    for await (const page of this.pages(normalized)) {
      for (const object of page.Contents ?? []) {
        if (!object.Key || !isBackupFile(object.Key)) continue;
        files.push({
          key: object.Key,
          name: basename(object.Key),
          size: object.Size ?? 0,
          lastModified: object.LastModified ?? new Date(0),
        });
      }
    }
    return files.sort(newestFirst);
  }

  async download(key: string): Promise<Readable> {
    if (!this.isS3) {
      const root = resolve(this.opts.local.dir);
      const file = resolve(root, key);
      if (!file.startsWith(`${root}/`)) {
        throw new Error(`Path "${key}" is outside the backup directory.`);
      }
      return createReadStream(file);
    }

    const { GetObjectCommand } = await this.sdk();
    const client = await this.client();
    const result = (await client.send(
      new GetObjectCommand({ Bucket: this.opts.s3.bucket, Key: key }),
    )) as GetObjectResult;
    if (!result.Body) throw new Error(`Backup "${key}" returned an empty body.`);
    return result.Body;
  }
}
