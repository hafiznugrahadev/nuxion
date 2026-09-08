import { createHash, randomBytes, randomUUID } from 'node:crypto';

/**
 * Opaque refresh tokens. The raw token is high-entropy (256-bit) and lives only
 * in the client's httpOnly cookie; we persist a deterministic SHA-256 digest so
 * it can be looked up on refresh without ever storing the raw value.
 */
export const generateRefreshToken = (): string => randomBytes(32).toString('hex');

/** A high-entropy opaque token (256-bit) for one-time flows (e.g. password reset). */
export const generateOpaqueToken = (): string => randomBytes(32).toString('hex');

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/** Identifies all tokens rotated from a single login — used for reuse detection. */
export const generateTokenFamily = (): string => randomUUID();
