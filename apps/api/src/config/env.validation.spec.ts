import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.validation';

// validateEnv is a pure function of the env record — no DB/app needed.
const baseEnv = {
  DATABASE_URL: 'postgres://localhost:5432/nuxion',
  JWT_SECRET: 'at-least-16-chars-secret',
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
});
