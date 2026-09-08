/** DI token for the active storage driver (local | s3). */
export const STORAGE_DRIVER = Symbol('STORAGE_DRIVER');

export interface UploadInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
  /** Sanitised destination prefix, e.g. "avatars". */
  folder: string;
}

export interface StoredFile {
  /** Storage key (path within the bucket/dir), persisted by callers. */
  key: string;
  /** Publicly resolvable URL for the stored object. */
  url: string;
  mimeType: string;
  size: number;
}

/**
 * Object-storage contract. Both the local-disk and S3-compatible drivers
 * implement this, so call-sites never depend on the backing store.
 */
export interface StorageDriver {
  upload(input: UploadInput): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  url(key: string): string;
  /**
   * Time-limited presigned GET URL for a private object. Implemented only by
   * drivers whose objects aren't publicly readable (s3 keeps its bucket private).
   * Absent on `local` — its `/uploads` mount is already public — so callers fall
   * back to `url()` when this is undefined.
   */
  signedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}
