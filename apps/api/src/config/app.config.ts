import { registerAs } from '@nestjs/config';

/**
 * Strongly-typed app config namespace — the ONLY place (with database.config) that
 * reads process.env. Everything else injects ConfigService and reads `app.*`.
 * Flow: .env → validateEnv → these namespaces → ConfigService → instances.
 */
export const appConfig = registerAs('app', () => ({
  env: process.env.NODE_ENV ?? 'development',
  // Single root .env uses API_PORT; containers/compose set PORT, which wins.
  port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '4400', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  // Frontend base URL — single source of truth (like Laravel's APP_URL).
  appUrl: process.env.APP_URL || 'http://localhost:4300',
  // CORS origin defaults to APP_URL; explicit CORS_ORIGIN overrides (e.g. multiple origins).
  corsOrigin: process.env.CORS_ORIGIN || process.env.APP_URL || '*',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  jwt: {
    // Required & validated at startup (see env.validation.ts) — no insecure fallback.
    secret: process.env.JWT_SECRET as string,
    // Short-lived access token; long-lived opaque refresh token (see auth.service.ts).
    accessExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '7', 10),
  },
  cookie: {
    // Cross-site in prod (web + api on different hosts) requires SameSite=None+Secure.
    secure: (process.env.NODE_ENV ?? 'development') === 'production',
  },
  swagger: {
    enabled: (process.env.SWAGGER_ENABLED ?? 'true') !== 'false',
    user: process.env.SWAGGER_USER ?? 'admin',
    password: process.env.SWAGGER_PASSWORD ?? 'admin',
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL_MS ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    // Skip ALL rate limiting (incl. per-route @Throttle) — for dev/E2E/load tests.
    disabled: (process.env.THROTTLE_DISABLED ?? 'false') === 'true',
  },
  passwordReset: {
    ttlMinutes: parseInt(process.env.PASSWORD_RESET_TTL_MIN ?? '30', 10),
    // Derived from APP_URL — no separate env var needed.
    url: `${process.env.APP_URL || 'http://localhost:4300'}/reset-password`,
  },
  registration: {
    // Off by default (kit is admin-provisioned); opt in for self-service sign-up.
    enabled: (process.env.AUTH_REGISTRATION_ENABLED ?? 'false') === 'true',
  },
}));

export type AppConfig = ReturnType<typeof appConfig>;
