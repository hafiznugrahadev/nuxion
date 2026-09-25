import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import { createCipheriv, createDecipheriv, randomInt, randomBytes, scryptSync } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import type { Database } from '@db/relations';
import { roleNamesFor } from '@db/user-roles';
import { users } from '@db/schema';
import { RedisService } from '@infrastructure/redis/redis.service';
import { verifyPassword } from '@common/utils/password';
import { generateOpaqueToken, hashToken } from '@common/utils/token.util';
import { toSessionUser, type SessionUser, type UserWithRoles } from './session-user';

/** Pending TOTP secret lives in Redis until activation is confirmed. */
const SETUP_KEY = (userId: string) => `2fa:setup:${userId}`;
/** Login challenge (issued after a valid password, consumed by /auth/2fa/verify). */
const CHALLENGE_KEY = (challengeId: string) => `2fa:challenge:${challengeId}`;

const SETUP_TTL_SECONDS = 10 * 60;
const CHALLENGE_TTL_SECONDS = 5 * 60;
const MAX_CHALLENGE_ATTEMPTS = 5;

/** How many recovery codes are minted per (re)generation. */
const RECOVERY_CODE_COUNT = 8;
/** Unambiguous alphabet — no I/L/O/0/1 so codes survive being read aloud. */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

interface PendingChallenge {
  userId: string;
  attempts: number;
  /** Epoch ms — kept so failed attempts don't silently extend the TTL. */
  expiresAt: number;
}

@Injectable()
export class TwoFactorService {
  /** AES-256 key derived from JWT_SECRET — the secret never sits in plaintext at rest. */
  private readonly encryptionKey: Buffer;

  constructor(
    @InjectDrizzle()
    private readonly db: Database,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const jwtSecret = config.getOrThrow<string>('app.jwt.secret');
    this.encryptionKey = scryptSync(jwtSecret, 'nuxion:2fa:v1', 32);
  }

  /**
   * Step 1 of setup: mint a TOTP secret. It is parked in Redis — the DB is only
   * touched once the user proves the authenticator works (activate).
   */
  async beginSetup(user: { id: string; email: string }): Promise<{
    otpauthUrl: string;
    qrDataUrl: string;
    secret: string;
  }> {
    this.assertEnabled();
    const [existing] = await this.db
      .select({ twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);
    if (existing?.twoFactorEnabled) {
      throw new ConflictException('Two-factor auth is already enabled for this account');
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({ issuer: 'Nuxion', label: user.email, secret });
    await this.redis.set(SETUP_KEY(user.id), { secret }, SETUP_TTL_SECONDS);

    return { otpauthUrl, qrDataUrl: await QRCode.toDataURL(otpauthUrl), secret };
  }

  /**
   * Step 2 of setup: confirm the authenticator with a live code, persist the
   * (encrypted) secret and mint recovery codes. Plaintext codes are returned
   * exactly once — only their SHA-256 hashes are stored.
   */
  async activate(
    user: { id: string },
    code: string,
  ): Promise<{ user: SessionUser; recoveryCodes: string[] }> {
    this.assertEnabled();
    const pending = await this.redis.get<{ secret: string }>(SETUP_KEY(user.id));
    if (!pending) throw new BadRequestException('Setup expired — restart the setup process');

    if (!(await this.isValidTotp(pending.secret, code))) {
      throw new UnauthorizedException('Invalid verification code');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    const [updated] = await this.db
      .update(users)
      .set({
        twoFactorEnabled: true,
        twoFactorSecret: this.encrypt(pending.secret),
        recoveryCodes: JSON.stringify(recoveryCodes.map((c) => hashToken(c))),
      })
      .where(eq(users.id, user.id))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        twoFactorEnabled: users.twoFactorEnabled,
      });
    await this.redis.del(SETUP_KEY(user.id));

    return {
      user: toSessionUser({ ...updated, roles: await roleNamesFor(this.db, user.id) }),
      recoveryCodes,
    };
  }

  /** A challenge is only issued after the password step already succeeded. */
  async issueLoginChallenge(userId: string): Promise<string> {
    const challengeId = generateOpaqueToken();
    const payload: PendingChallenge = {
      userId,
      attempts: 0,
      expiresAt: Date.now() + CHALLENGE_TTL_SECONDS * 1000,
    };
    await this.redis.set(CHALLENGE_KEY(challengeId), payload, CHALLENGE_TTL_SECONDS);
    return challengeId;
  }

  /**
   * Consume a login challenge with a TOTP code or a recovery code (each recovery
   * code is single-use). Failed attempts are counted on the challenge itself;
   * too many invalidate it and the user starts the login over.
   */
  async verifyLoginChallenge(challengeId: string, code: string): Promise<UserWithRoles> {
    this.assertEnabled();
    const challenge = await this.redis.get<PendingChallenge>(CHALLENGE_KEY(challengeId));
    if (!challenge) throw new BadRequestException('Two-factor challenge expired or unknown');

    const fail = async (): Promise<never> => {
      challenge.attempts += 1;
      if (challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
        await this.redis.del(CHALLENGE_KEY(challengeId));
      } else {
        const ttl = Math.ceil((challenge.expiresAt - Date.now()) / 1000);
        if (ttl > 0) await this.redis.set(CHALLENGE_KEY(challengeId), challenge, ttl);
      }
      throw new UnauthorizedException('Invalid verification code');
    };

    // Internal read: the secret + recovery hashes are needed for verification.
    // They never leave this method — the result flows through toSessionUser.
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        twoFactorEnabled: users.twoFactorEnabled,
        twoFactorSecret: users.twoFactorSecret,
        recoveryCodes: users.recoveryCodes,
      })
      .from(users)
      .where(eq(users.id, challenge.userId))
      .limit(1);
    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
      await this.redis.del(CHALLENGE_KEY(challengeId));
      throw new BadRequestException('Two-factor is not enabled for this account');
    }

    const secret = this.decrypt(user.twoFactorSecret);
    if (await this.isValidTotp(secret, code)) {
      await this.redis.del(CHALLENGE_KEY(challengeId));
      return { ...user, roles: await roleNamesFor(this.db, user.id) };
    }

    // Fall back to recovery codes (normalized: trimmed + uppercased).
    const normalized = code.trim().toUpperCase();
    const hashes: string[] = user.recoveryCodes ? JSON.parse(user.recoveryCodes) : [];
    const match = hashToken(normalized);
    const index = hashes.indexOf(match);
    if (index !== -1) {
      hashes.splice(index, 1); // single-use: consume it
      await this.db
        .update(users)
        .set({ recoveryCodes: JSON.stringify(hashes) })
        .where(eq(users.id, user.id));
      await this.redis.del(CHALLENGE_KEY(challengeId));
      return { ...user, roles: await roleNamesFor(this.db, user.id) };
    }

    return fail();
  }

  /** Re-mint recovery codes after re-verifying the account password. */
  async regenerateRecoveryCodes(userId: string, password: string): Promise<string[]> {
    this.assertEnabled();
    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new UnauthorizedException();
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor is not enabled for this account');
    }
    if (!(await verifyPassword(password, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const recoveryCodes = this.generateRecoveryCodes();
    await this.db
      .update(users)
      .set({ recoveryCodes: JSON.stringify(recoveryCodes.map((c) => hashToken(c))) })
      .where(eq(users.id, userId));
    return recoveryCodes;
  }

  /** All endpoints are dormant unless the feature flag is on. */
  private assertEnabled(): void {
    if (!this.config.get<boolean>('app.twoFactor.enabled')) {
      throw new ForbiddenException('Two-factor auth is disabled');
    }
  }

  private async isValidTotp(secret: string, token: string): Promise<boolean> {
    const code = token.replace(/\s+/g, '');
    // otplib throws (rather than returning valid:false) on malformed tokens —
    // e.g. an 11-char recovery code hitting this path must simply not match.
    if (!/^\d{6}$/.test(code)) return false;
    try {
      const { valid } = await verify({
        secret,
        token: code,
        // ±1 period of clock drift — the "standard" tolerance for 2FA.
        epochTolerance: 30,
      });
      return valid;
    } catch {
      return false;
    }
  }

  private generateRecoveryCodes(): string[] {
    return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
      const part = () =>
        Array.from(
          { length: 5 },
          () => RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)],
        ).join('');
      return `${part()}-${part()}`;
    });
  }

  private encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [
      iv.toString('base64'),
      cipher.getAuthTag().toString('base64'),
      encrypted.toString('base64'),
    ].join('.');
  }

  private decrypt(payload: string): string {
    const [iv, tag, data] = payload.split('.').map((p) => Buffer.from(p, 'base64'));
    if (!iv || !tag || !data) throw new BadRequestException('Corrupted two-factor secret');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}
