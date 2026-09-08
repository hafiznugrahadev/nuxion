import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { StorageDriver, StoredFile, UploadInput } from '../storage.types';

export interface S3DriverOptions {
  /** Custom endpoint for S3-compatible stores (e.g. MinIO http://localhost:9000). */
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  /** Path-style addressing — required by MinIO and most self-hosted stores. */
  forcePathStyle: boolean;
  /** Optional CDN/public base URL fronting the bucket. */
  publicBaseUrl?: string;
}

/** Structural view of the bits of `@aws-sdk/client-s3` this driver uses. */
interface S3ClientLike {
  send(command: unknown): Promise<unknown>;
}
interface S3Module {
  S3Client: new (config: unknown) => S3ClientLike;
  CreateBucketCommand: new (input: unknown) => unknown;
  PutObjectCommand: new (input: unknown) => unknown;
  DeleteObjectCommand: new (input: unknown) => unknown;
  GetObjectCommand: new (input: unknown) => unknown;
}
/** Structural view of `@aws-sdk/s3-request-presigner`. */
interface PresignerModule {
  getSignedUrl: (
    client: S3ClientLike,
    command: unknown,
    options: { expiresIn: number },
  ) => Promise<string>;
}

// Held as `string`s (not literals) so the TS compiler treats both AWS packages as
// runtime-only, OPTIONAL dependencies: deployments on the `local` driver never
// need them installed or resolvable. They are imported lazily only under S3.
const S3_SDK: string = '@aws-sdk/client-s3';
const PRESIGNER_SDK: string = '@aws-sdk/s3-request-presigner';

/**
 * S3-compatible driver (AWS S3, MinIO, RustFS, …). The AWS SDK is loaded lazily
 * (see S3_SDK). Objects are served via `signedUrl()` (presigned, time-limited
 * GETs), so the bucket stays PRIVATE — no anonymous-read policy required. `url()`
 * still returns the plain public URL for cases where a CDN/public bucket fronts
 * the store (S3_PUBLIC_BASE_URL).
 */
export class S3StorageDriver implements StorageDriver {
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly region: string;
  private readonly publicBaseUrl?: string;
  /** Browser-reachable endpoint the presigned URL is signed for (see below). */
  private readonly presignEndpoint?: string;
  private clientPromise?: Promise<S3ClientLike>;
  private presignClientPromise?: Promise<S3ClientLike>;
  /** One-shot bucket bootstrap (see ensureBucket). */
  private ensureBucketPromise?: Promise<void>;

  constructor(private readonly opts: S3DriverOptions) {
    this.bucket = opts.bucket;
    this.endpoint = opts.endpoint?.replace(/\/+$/, '');
    this.region = opts.region;
    this.publicBaseUrl = opts.publicBaseUrl?.replace(/\/+$/, '');
    // Presigned GETs must be signed for the host the BROWSER will hit, not the
    // in-cluster endpoint the API uses for put/delete (e.g. http://rustfs:9000,
    // unreachable from a browser). Path-style public base is `<endpoint>/<bucket>`,
    // so strip the trailing bucket to recover the public endpoint. Falls back to
    // the operational endpoint if no public base is configured.
    const bucketSuffix = `/${this.bucket}`;
    this.presignEndpoint = this.publicBaseUrl?.endsWith(bucketSuffix)
      ? this.publicBaseUrl.slice(0, -bucketSuffix.length)
      : (this.endpoint ?? this.publicBaseUrl);
  }

  private async sdk(): Promise<S3Module> {
    try {
      return (await import(S3_SDK)) as S3Module;
    } catch {
      throw new Error(
        'STORAGE_DRIVER=s3 requires the "@aws-sdk/client-s3" package. Run: bun add @aws-sdk/client-s3',
      );
    }
  }

  private async presigner(): Promise<PresignerModule> {
    try {
      return (await import(PRESIGNER_SDK)) as PresignerModule;
    } catch {
      throw new Error(
        'STORAGE_DRIVER=s3 signed URLs require "@aws-sdk/s3-request-presigner". Run: bun add @aws-sdk/s3-request-presigner',
      );
    }
  }

  private client(): Promise<S3ClientLike> {
    if (!this.clientPromise) {
      this.clientPromise = this.sdk().then(
        ({ S3Client }) =>
          new S3Client({
            region: this.opts.region,
            endpoint: this.opts.endpoint,
            forcePathStyle: this.opts.forcePathStyle,
            credentials:
              this.opts.accessKeyId && this.opts.secretAccessKey
                ? { accessKeyId: this.opts.accessKeyId, secretAccessKey: this.opts.secretAccessKey }
                : undefined,
          }),
      );
    }
    return this.clientPromise;
  }

  /** Lazy client signing for the public (browser-reachable) endpoint — presign only. */
  private presignClient(): Promise<S3ClientLike> {
    if (!this.presignClientPromise) {
      this.presignClientPromise = this.sdk().then(
        ({ S3Client }) =>
          new S3Client({
            region: this.opts.region,
            endpoint: this.presignEndpoint,
            forcePathStyle: this.opts.forcePathStyle,
            credentials:
              this.opts.accessKeyId && this.opts.secretAccessKey
                ? { accessKeyId: this.opts.accessKeyId, secretAccessKey: this.opts.secretAccessKey }
                : undefined,
          }),
      );
    }
    return this.presignClientPromise;
  }

  /**
   * Idempotently create the configured bucket before the first upload. Fresh
   * environments (new RustFS/MinIO volume, new Dokploy provision) start with
   * zero buckets and the first upload would 500 with NoSuchBucket otherwise.
   * Memoized: one CreateBucket per process; "already exists/owned" is fine.
   */
  private ensureBucket(): Promise<void> {
    this.ensureBucketPromise ??= (async () => {
      const { CreateBucketCommand } = await this.sdk();
      const client = await this.client();
      try {
        await client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch (err) {
        const name = (err as { name?: string; Code?: string })?.name ?? '';
        const code = (err as { Code?: string })?.Code ?? '';
        if (
          !['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(name) &&
          !code.includes('BucketAlready')
        ) {
          throw err;
        }
      }
    })();
    return this.ensureBucketPromise;
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    await this.ensureBucket();
    const { PutObjectCommand } = await this.sdk();
    const client = await this.client();
    const ext = extname(input.originalName)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, '');
    const key = `${input.folder}/${randomUUID()}${ext}`;
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
      }),
    );
    return { key, url: this.url(key), mimeType: input.mimeType, size: input.size };
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await this.sdk();
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  /**
   * Presigned, time-limited GET URL for a private object. Signed for the public
   * endpoint so a browser can fetch it directly; the bucket itself stays private
   * (no anonymous policy needed). Generation is offline (no network call), so the
   * in-cluster API never has to reach the public host.
   */
  async signedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const { GetObjectCommand } = await this.sdk();
    const { getSignedUrl } = await this.presigner();
    const client = await this.presignClient();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }

  url(key: string): string {
    if (this.publicBaseUrl) return `${this.publicBaseUrl}/${key}`;
    // Path-style for custom endpoints (MinIO); virtual-hosted for real AWS S3.
    if (this.endpoint) return `${this.endpoint}/${this.bucket}/${key}`;
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
