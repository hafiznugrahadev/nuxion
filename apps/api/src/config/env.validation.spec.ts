import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

// validateEnv is a pure function of the env record — no DB/app needed.
const baseEnv = {
  DATABASE_URL: 'postgres://localhost:5432/nuxion',
  JWT_SECRET: 'at-least-16-chars-secret',
};
const productionEnv = {
  ...baseEnv,
  NODE_ENV: 'production',
  MAIL_TRANSPORT: 'smtp',
  SWAGGER_ENABLED: 'false',
};

describe('validateEnv', () => {
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
      expect(() => validateEnv(productionEnv)).not.toThrow();
    });

    it('accepts an explicit origin allow-list in production', () => {
      expect(() =>
        validateEnv({
          ...productionEnv,
          NODE_ENV: 'production',
          CORS_ORIGIN: 'https://app.example.com,https://admin.example.com',
        }),
      ).not.toThrow();
    });
  });

  describe('production mail and docs', () => {
    it('rejects the logging mail sink in production', () => {
      expect(() => validateEnv({ ...productionEnv, MAIL_TRANSPORT: 'log' })).toThrow(
        /MAIL_TRANSPORT/,
      );
    });

    it('rejects enabled Swagger with default or weak credentials', () => {
      for (const password of ['admin', 'short', 'administrator123456']) {
        expect(() =>
          validateEnv({
            ...productionEnv,
            SWAGGER_ENABLED: 'true',
            SWAGGER_USER: 'administrator123456',
            SWAGGER_PASSWORD: password,
          }),
        ).toThrow(/Swagger/);
      }
    });

    it('accepts SMTP and enabled docs with a distinct long password', () => {
      expect(() =>
        validateEnv({
          ...productionEnv,
          SWAGGER_ENABLED: 'true',
          SWAGGER_USER: 'docs',
          SWAGGER_PASSWORD: 'fixture-docs-password-123',
        }),
      ).not.toThrow();
    });

    it('rejects a whitespace-only production Swagger password', () => {
      expect(() =>
        validateEnv({
          ...productionEnv,
          SWAGGER_ENABLED: 'true',
          SWAGGER_USER: 'docs',
          SWAGGER_PASSWORD: ' '.repeat(32),
        }),
      ).toThrow(/Swagger/);
    });

    it('allows the development mail sink and default docs outside production', () => {
      expect(() => validateEnv({ ...baseEnv, NODE_ENV: 'test' })).not.toThrow();
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
