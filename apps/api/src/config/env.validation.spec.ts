import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

// validateEnv is a pure function of the env record — no DB/app needed.
const baseEnv = {
  DATABASE_URL: 'postgres://localhost:5432/nuxion',
  BETTER_AUTH_SECRET: 'at-least-thirty-two-characters-secret',
};

describe('validateEnv', () => {
  it('allows blank SMTP configuration when password reset delivery is disabled', () => {
    const config = validateEnv({
      ...baseEnv,
      NODE_ENV: 'production',
      MAIL_TRANSPORT: 'smtp',
      MAIL_SMTP_HOST: '',
      MAIL_SMTP_PASSWORD: '',
      AUTH_PASSWORD_RESET_ENABLED: 'false',
    });
    expect(config.AUTH_PASSWORD_RESET_ENABLED).toBe(false);
    expect(validateEnv(baseEnv).AUTH_PASSWORD_RESET_ENABLED).toBe(true);
  });

  it('requires the private Blob credential when that storage driver is selected', () => {
    expect(() => validateEnv({ ...baseEnv, STORAGE_DRIVER: 'vercel-blob' })).toThrow(
      /BLOB_READ_WRITE_TOKEN/,
    );
    expect(() =>
      validateEnv({
        ...baseEnv,
        STORAGE_DRIVER: 'vercel-blob',
        BLOB_READ_WRITE_TOKEN: 'server-only-token',
      }),
    ).not.toThrow();
  });

  describe('CORS_ORIGIN wildcard (credentialed CORS hardening)', () => {
    it('accepts a wildcard outside production (dev reflect-all convenience)', () => {
      expect(() =>
        validateEnv({ ...baseEnv, NODE_ENV: 'development', CORS_ORIGIN: '*' }),
      ).not.toThrow();
    });

    it('rejects an explicit wildcard in production', () => {
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'production', CORS_ORIGIN: '*' })).toThrow(
        /CORS_ORIGIN/,
      );
    });

    it('accepts an absent CORS_ORIGIN in production (app.config falls back to APP_URL)', () => {
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'production' })).not.toThrow();
    });

    it('accepts an explicit origin allow-list in production', () => {
      expect(() =>
        validateEnv({
          ...baseEnv,
          NODE_ENV: 'production',
          CORS_ORIGIN: 'https://app.example.com,https://admin.example.com',
        }),
      ).not.toThrow();
    });
  });

  describe('REDIS_URL (single connection string)', () => {
    it('accepts redis:// and rediss:// (TLS) URLs', () => {
      expect(() => validateEnv({ ...baseEnv, REDIS_URL: 'redis://:pw@host:6379/0' })).not.toThrow();
      expect(() =>
        validateEnv({ ...baseEnv, REDIS_URL: 'rediss://default:pw@cache.example.com:6379' }),
      ).not.toThrow();
    });

    it('rejects a non-redis scheme', () => {
      expect(() => validateEnv({ ...baseEnv, REDIS_URL: 'postgres://host:5432' })).toThrow(
        /REDIS_URL/,
      );
    });

    it('rejects a malformed URL', () => {
      expect(() => validateEnv({ ...baseEnv, REDIS_URL: 'redis://[::1' })).toThrow(/REDIS_URL/);
    });

    it('treats an empty string as unset (compose `${REDIS_URL:-}` pass-through)', () => {
      expect(() => validateEnv({ ...baseEnv, REDIS_URL: '' })).not.toThrow();
    });
  });
});
