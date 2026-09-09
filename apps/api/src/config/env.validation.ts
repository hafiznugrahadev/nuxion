import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

/** Coerce common env truthy strings ("true"/"1") into a real boolean. */
const toBool = ({ value }: { value: unknown }): boolean =>
  value === true || value === 'true' || value === '1';

/**
 * Env schema validated at startup with class-validator (SPEC: validate env with
 * class-validator, not Zod). Wire into ConfigModule via `validate: validateEnv`.
 */
export enum NodeEnv {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  @IsOptional()
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  PORT = 4400;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsString()
  @IsOptional()
  CORS_ORIGIN = '*';

  @IsString()
  DATABASE_URL!: string;

  @IsString()
  @IsOptional()
  REDIS_HOST = 'localhost';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  REDIS_PORT = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD = '';

  @IsString()
  @MinLength(16, { message: 'JWT_SECRET must be at least 16 characters' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '15m';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  JWT_REFRESH_EXPIRES_DAYS = 7;

  @IsString()
  @IsOptional()
  LOG_LEVEL = 'info';

  // ── Logging → Mattermost (self-hosted Slack; webhook push, level-gated) ────
  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  MATTERMOST_LOG_ENABLED = false;

  // Required (must be a URL; localhost allowed) only when the driver is enabled.
  // No @IsOptional here — it would skip validation even for the conditional
  // branch; @ValidateIf already makes it a no-op when the driver is disabled.
  @ValidateIf((o) => o.MATTERMOST_LOG_ENABLED === true)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  MATTERMOST_LOG_WEBHOOK_URL?: string;

  @IsIn(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
  @IsOptional()
  MATTERMOST_LOG_LEVEL: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' = 'error';

  @IsString()
  @IsOptional()
  MATTERMOST_LOG_CHANNEL?: string;

  @IsString()
  @IsOptional()
  MATTERMOST_LOG_USERNAME = 'Nuxion API';

  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  MATTERMOST_LOG_SKIP_HTTP = true;

  // ── Swagger docs (protected with Basic Auth) ──────────────────────────────
  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  SWAGGER_ENABLED = true;

  @IsString()
  @IsOptional()
  SWAGGER_USER = 'admin';

  @IsString()
  @IsOptional()
  SWAGGER_PASSWORD = 'admin';

  // ── Rate limiting (global ThrottlerModule) ────────────────────────────────
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  THROTTLE_TTL_MS = 60000;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  THROTTLE_LIMIT = 100;

  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  THROTTLE_DISABLED = false;

  // ── Mail (transport: log = dev/log-only, smtp = real delivery) ─────────────
  @IsIn(['log', 'smtp'])
  @IsOptional()
  MAIL_TRANSPORT: 'log' | 'smtp' = 'log';

  @IsString()
  @IsOptional()
  MAIL_FROM = 'Nuxion <no-reply@nuxion.test>';

  @IsString()
  @IsOptional()
  MAIL_SMTP_HOST = 'localhost';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  MAIL_SMTP_PORT = 1025;

  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  MAIL_SMTP_SECURE = false;

  @IsString()
  @IsOptional()
  MAIL_SMTP_USER?: string;

  @IsString()
  @IsOptional()
  MAIL_SMTP_PASSWORD?: string;

  // ── App URL (single source of truth for the frontend URL) ─────────────────
  @IsString()
  @IsOptional()
  APP_URL = 'http://localhost:4300';

  // ── Password reset ─────────────────────────────────────────────────────────
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  PASSWORD_RESET_TTL_MIN = 30;

  // ── Self-service registration (off by default; kit is admin-provisioned) ────
  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  AUTH_REGISTRATION_ENABLED = false;

  // ── Database backups (read-only; consumed by `db:restore`) ─────────────────
  // All optional: the app must boot fine without any backup config. The CLI
  // validates what it actually needs at run time.
  @IsIn(['s3', 'local'])
  @IsOptional()
  BACKUP_DRIVER: 's3' | 'local' = 's3';

  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  BACKUP_RESTORE_UI_ENABLED = false;

  @IsString()
  @IsOptional()
  BACKUP_S3_ENDPOINT?: string;

  @IsString()
  @IsOptional()
  BACKUP_S3_REGION?: string;

  @IsString()
  @IsOptional()
  BACKUP_S3_BUCKET?: string;

  @IsString()
  @IsOptional()
  BACKUP_S3_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  BACKUP_S3_SECRET_ACCESS_KEY?: string;

  @Transform(toBool)
  @IsBoolean()
  @IsOptional()
  BACKUP_S3_FORCE_PATH_STYLE = true;

  @IsString()
  @IsOptional()
  BACKUP_S3_PREFIX?: string;

  @IsString()
  @IsOptional()
  BACKUP_LOCAL_DIR?: string;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const details = errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n  - ');
    throw new Error(`Invalid environment configuration:\n  - ${details}`);
  }

  return validated;
}
