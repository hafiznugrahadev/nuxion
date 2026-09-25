import { registerAs } from '@nestjs/config';

/**
 * Strongly-typed app config namespace — the ONLY place (with database.config) that
 * reads process.env. Everything else injects ConfigService and reads `app.*`.
 * Flow: .env → validateEnv → these namespaces → ConfigService → instances.
 */
/** Extract a hostname for the WebAuthn RP ID; never throws on a malformed URL. */
const safeHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
};

/**
 * Serialize an origin the way browsers send the `Origin` header (lower-case,
 * default port dropped) — the exact form Nest's CSRF trustedOrigins compares
 * against. Throws on anything that is not http(s)://host[:port], so a broken
 * CORS_ORIGIN/APP_URL fails at startup instead of silently not matching.
 */
const parseOrigin = (raw: string): string => {
  const trimmed = raw.trim();
  const url = new URL(trimmed);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid origin "${trimmed}": expected http(s)://host[:port]`);
  }
  return url.origin;
};

/**
 * Express `trust proxy` value for the TRUST_PROXY env var. The API sits behind
 * exactly one TLS proxy in every supported environment (OrbStack's gateway in
 * dev, Dokploy's Traefik in prod), so the default is 1 hop: req.ip becomes the
 * real client address (rate limiting) and req.protocol honours
 * X-Forwarded-Proto, while a client-forged X-Forwarded-For entry is the one
 * entry the hop limit ignores. "false"/"0" for a bare direct run, "true" only
 * for local debugging (trusts every proxy — spoofable).
 */
const parseTrustProxy = (raw: string | undefined): boolean | number => {
  const value = raw?.trim();
  if (!value || value === '1') return 1;
  if (value === 'true') return true;
  if (value === 'false' || value === '0') return false;
  const hops = Number.parseInt(value, 10);
  return Number.isNaN(hops) ? 1 : hops;
};

const appConfigFactory = () => {
  const appUrl = process.env.APP_URL || 'http://localhost:4300';
  const corsOriginRaw = process.env.CORS_ORIGIN || process.env.APP_URL || '*';
  return {
    env: process.env.NODE_ENV ?? 'development',
    // Single root .env uses API_PORT; containers/compose set PORT, which wins.
    port: parseInt(process.env.PORT ?? process.env.API_PORT ?? '4400', 10),
    apiPrefix: process.env.API_PREFIX ?? 'api',
    // Frontend base URL — single source of truth (like Laravel's APP_URL).
    appUrl,
    // CORS origin defaults to APP_URL; explicit CORS_ORIGIN overrides (e.g. multiple origins).
    corsOrigin: corsOriginRaw,
    // CSRF trusted origins — the SAME origins CORS allows credentials from
    // (see enableCsrfProtection in main.ts), so there is no second list to
    // keep in sync. With the dev-convenience "*" reflect-all CORS there is no
    // list to trust, so fall back to the canonical frontend APP_URL.
    csrf: {
      trustedOrigins:
        corsOriginRaw === '*'
          ? [parseOrigin(appUrl)]
          : corsOriginRaw
              .split(',')
              .map((origin) => origin.trim())
              .filter(Boolean)
              .map(parseOrigin),
    },
    // Express `trust proxy` (see parseTrustProxy): 1 TLS hop by default.
    trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
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
    twoFactor: {
      // Mandatory TOTP for every account when true; completely dormant when false
      // (login ignores configured authenticators and no setup endpoints are exposed).
      enabled: (process.env.AUTH_2FA_ENABLED ?? 'false') === 'true',
    },
    passkey: {
      // Independent of TOTP — passkey sign-in works even with 2FA disabled.
      enabled: (process.env.AUTH_PASSKEY_ENABLED ?? 'false') === 'true',
    },
    webauthn: {
      rpName: process.env.WEBAUTHN_RP_NAME ?? 'Nuxion',
      // The ceremony runs on the WEB app's origin; the RP ID must be its host
      // (or a registrable suffix of it). Fallback keeps localhost dev working.
      rpId: process.env.WEBAUTHN_RP_ID ?? safeHostname(appUrl),
      origins: (process.env.WEBAUTHN_ORIGINS ?? appUrl)
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    },
  };
};

export const appConfig = registerAs('app', appConfigFactory);

export type AppConfig = ReturnType<typeof appConfig>;
