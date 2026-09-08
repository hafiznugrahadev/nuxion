import { registerAs } from '@nestjs/config';

/**
 * Backup config namespace — the object storage where the DB dumps live (Dokploy
 * writes them; this app only READS them for `db:restore`). Deliberately separate
 * from the uploads `storage` namespace: different bucket, different credentials,
 * different contract (list/download vs upload/delete/url).
 *
 * Only credentials + bucket are configured here. The folder inside the bucket is
 * chosen at restore time by browsing the bucket, so no prefix has to be pinned in
 * env — `BACKUP_S3_PREFIX` is only an optional starting point for that browsing.
 */
export const backupConfig = registerAs('backup', () => ({
  // 's3' (default — RustFS / MinIO / AWS S3) | 'local' (a folder on disk, for dev).
  driver: process.env.BACKUP_DRIVER ?? 's3',
  // Phase 2: gates the admin restore endpoint + UI. Off unless explicitly enabled.
  restoreUiEnabled: (process.env.BACKUP_RESTORE_UI_ENABLED ?? 'false') === 'true',
  local: { dir: process.env.BACKUP_LOCAL_DIR ?? './storage/backups' },
  s3: {
    endpoint: process.env.BACKUP_S3_ENDPOINT,
    region: process.env.BACKUP_S3_REGION ?? 'us-east-1',
    bucket: process.env.BACKUP_S3_BUCKET,
    accessKeyId: process.env.BACKUP_S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKUP_S3_SECRET_ACCESS_KEY,
    forcePathStyle: (process.env.BACKUP_S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
    // Optional: where browsing STARTS. Empty = bucket root. Not a hard filter —
    // the operator can still navigate elsewhere from the CLI.
    prefix: process.env.BACKUP_S3_PREFIX ?? '',
  },
}));

export type BackupConfig = ReturnType<typeof backupConfig>;
