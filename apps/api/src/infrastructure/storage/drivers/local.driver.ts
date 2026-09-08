import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { StorageDriver, StoredFile, UploadInput } from '../storage.types';

export interface LocalDriverOptions {
  /** Root directory uploads are written to (resolved from the API cwd). */
  dir: string;
  /** Absolute base URL the static `/uploads` mount is served from. */
  publicBaseUrl: string;
}

/**
 * Local-filesystem driver (default, zero-infra). Files are served as static
 * assets at `/uploads` (mounted in main.ts) — outside the API prefix and the
 * response interceptor, so binary content streams untouched.
 */
export class LocalStorageDriver implements StorageDriver {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(opts: LocalDriverOptions) {
    this.root = resolve(opts.dir);
    this.publicBaseUrl = opts.publicBaseUrl.replace(/\/+$/, '');
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    const ext = extname(input.originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const key = `${input.folder}/${randomUUID()}${ext}`;
    const dest = this.safeJoin(key);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, input.buffer);
    return { key, url: this.url(key), mimeType: input.mimeType, size: input.size };
  }

  async delete(key: string): Promise<void> {
    await rm(this.safeJoin(key), { force: true });
  }

  url(key: string): string {
    return `${this.publicBaseUrl}/uploads/${key}`;
  }

  /** Resolve a key under the root, rejecting traversal outside it. */
  private safeJoin(key: string): string {
    const dest = resolve(join(this.root, key));
    if (dest !== this.root && !dest.startsWith(this.root + sep)) {
      throw new Error('Resolved path escapes the storage root');
    }
    return dest;
  }
}
