import { registerAs } from '@nestjs/config';

/**
 * Storage config namespace. Flow: .env → validateEnv → here → ConfigService.
 * Default driver is `local` (zero-infra); use `s3` or `vercel-blob` for durable object storage.
 */
const DEFAULT_PORT = process.env.PORT ?? process.env.API_PORT ?? '8000';

export const storageConfig = registerAs('storage', () => ({
  // 'local' (default) | 's3' | 'vercel-blob'.
  driver: process.env.STORAGE_DRIVER ?? 'local',
  maxFileSizeBytes: parseInt(process.env.STORAGE_MAX_FILE_SIZE_MB ?? '5', 10) * 1024 * 1024,
  // TTL of the signed GET URLs the remote drivers issue for private objects. The
  // URL is cached in Redis (keyed by object key) for slightly less than this, so
  // it's regenerated at most once per window — not on every read.
  signedUrlTtlSeconds: parseInt(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? '3600', 10),
  allowedMimeTypes: (
    process.env.STORAGE_ALLOWED_MIME ?? 'image/jpeg,image/png,image/webp,image/gif,application/pdf'
  )
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean),
  local: {
    dir: process.env.STORAGE_LOCAL_DIR ?? './storage/uploads',
    // Absolute base the static `/uploads` mount is reachable at (the API origin).
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL ?? `http://localhost:${DEFAULT_PORT}`,
  },
  blob: {
    token: process.env.BLOB_READ_WRITE_TOKEN,
    viewBaseUrl: `${(process.env.STORAGE_PUBLIC_BASE_URL || process.env.BETTER_AUTH_URL || `http://localhost:${DEFAULT_PORT}`).replace(/\/+$/, '')}/${process.env.API_PREFIX ?? 'api'}/files/view`,
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    bucket: process.env.S3_BUCKET ?? 'nuxion',
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
    publicBaseUrl: process.env.S3_PUBLIC_BASE_URL,
  },
}));

export type StorageConfig = ReturnType<typeof storageConfig>;
