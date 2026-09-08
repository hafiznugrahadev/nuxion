import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@infrastructure/redis/redis.service';
import { STORAGE_DRIVER, type StorageDriver, type StoredFile } from './storage.types';

/** Minimal shape of a Multer memory-storage file (avoids needing @types/multer). */
export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * Public storage facade (mirrors RedisService). Enforces the configured size +
 * MIME guardrails, then delegates to the active driver (local | s3). Inject this
 * anywhere; the StorageModule is @Global.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxBytes: number;
  private readonly allowedMime: string[];
  private readonly signedUrlTtl: number;

  constructor(
    @Inject(STORAGE_DRIVER) private readonly driver: StorageDriver,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.maxBytes = config.get<number>('storage.maxFileSizeBytes') ?? 5 * 1024 * 1024;
    this.allowedMime = config.get<string[]>('storage.allowedMimeTypes') ?? [];
    this.signedUrlTtl = config.get<number>('storage.signedUrlTtlSeconds') ?? 3600;
  }

  /** True when the active driver serves private objects via presigned URLs (s3). */
  get signed(): boolean {
    return typeof this.driver.signedUrl === 'function';
  }

  async upload(file: UploadedFile | undefined, folder?: string): Promise<StoredFile> {
    if (!file?.buffer) throw new BadRequestException('No file provided (field "file")');
    if (file.size > this.maxBytes) {
      throw new PayloadTooLargeException(
        `File exceeds the ${Math.round(this.maxBytes / 1024 / 1024)}MB limit`,
      );
    }
    if (this.allowedMime.length && !this.allowedMime.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(`Unsupported file type: ${file.mimetype}`);
    }
    return this.driver.upload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      folder: this.sanitizeFolder(folder),
    });
  }

  delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  url(key: string): string {
    return this.driver.url(key);
  }

  /**
   * Resolve a stored key to a browser-loadable URL. For signed drivers (s3) this
   * is a presigned GET, cached in Redis keyed by the object key — so the temp URL
   * is regenerated at most once per TTL window, not on every request, and a new
   * upload (new key) naturally bypasses the cache. For public drivers (local) it's
   * just the static URL. Cache TTL stays safely under the URL's own expiry.
   */
  async displayUrl(key: string): Promise<string> {
    if (typeof this.driver.signedUrl !== 'function') return this.driver.url(key);

    const cacheKey = `files:signed:${key}`;
    const cached = await this.safe(() => this.redis.get<string>(cacheKey));
    if (cached) return cached;

    const url = await this.driver.signedUrl(key, this.signedUrlTtl);
    await this.safe(() => this.redis.set(cacheKey, url, Math.max(60, this.signedUrlTtl - 300)));
    return url;
  }

  /** Run a cache op, swallowing errors so Redis is never a hard dependency. */
  private async safe<T>(op: () => Promise<T>): Promise<T | undefined> {
    try {
      return await op();
    } catch (err) {
      this.logger.warn(`storage cache op failed: ${(err as Error).message}`);
      return undefined;
    }
  }

  /** Restrict folders to a safe slug — prevents path traversal and odd keys. */
  private sanitizeFolder(folder?: string): string {
    const clean = (folder ?? 'uploads').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return clean || 'uploads';
  }
}
