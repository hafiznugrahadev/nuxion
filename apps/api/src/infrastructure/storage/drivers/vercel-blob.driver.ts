import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { del, issueSignedToken, presignUrl, put } from '@vercel/blob';
import type { StorageDriver, StoredFile, UploadInput } from '../storage.types';

export interface VercelBlobDriverOptions {
  readonly token: string;
  readonly viewBaseUrl: string;
}

export class VercelBlobStorageDriver implements StorageDriver {
  constructor(private readonly options: VercelBlobDriverOptions) {}

  async upload(input: UploadInput): Promise<StoredFile> {
    const extension = extname(input.originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const key = `${input.folder}/${randomUUID()}${extension}`;
    await put(key, input.buffer, {
      token: this.options.token,
      access: 'private',
      contentType: input.mimeType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return { key, url: this.url(key), mimeType: input.mimeType, size: input.size };
  }

  async delete(key: string): Promise<void> {
    await del(key, { token: this.options.token });
  }

  url(key: string): string {
    const url = new URL(this.options.viewBaseUrl);
    url.searchParams.set('key', key);
    return url.toString();
  }

  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const validUntil = Date.now() + expiresInSeconds * 1000;
    const signedToken = await issueSignedToken({
      token: this.options.token,
      pathname: key,
      operations: ['get'],
      validUntil,
    });
    const { presignedUrl } = await presignUrl(signedToken, {
      access: 'private',
      pathname: key,
      operation: 'get',
      validUntil,
    });
    return presignedUrl;
  }
}
