import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import { JwtService } from '@nestjs/jwt';
import { and, eq, isNull } from 'drizzle-orm';
import { UserRole } from '@nuxion/shared-types';
import type { Database } from '@db/relations';
import { roleNamesFor } from '@db/user-roles';
import {
  passwordResetTokens,
  refreshTokens,
  roles as rolesTable,
  userRoles,
  users,
  type UserRow,
} from '@db/schema';
import { MailService } from '@infrastructure/mail/mail.service';
import { UsersService } from '@modules/users/users.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { hashPassword, verifyPassword } from '@common/utils/password';
import {
  generateOpaqueToken,
  generateRefreshToken,
  generateTokenFamily,
  hashToken,
} from '@common/utils/token.util';
import type { JwtPayload } from './jwt.strategy';
import { TwoFactorService } from './two-factor.service';
import { toSessionUser, type SessionUser, type UserWithRoles } from './session-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export type { SessionUser } from './session-user';

/**
 * Returned by login when the password step succeeded but the account has TOTP
 * enabled: no tokens are issued until /auth/2fa/verify consumes the challenge.
 */
export interface TwoFactorLoginChallenge {
  twoFactorRequired: true;
  challengeId: string;
}

export type LoginResult = AuthTokens | TwoFactorLoginChallenge;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

/** Full user row plus role names — the shape the auth flow works with. */
type UserRowWithRoles = UserRow & { roles: { name: string }[] };

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectDrizzle()
    private readonly db: Database,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.findUserByEmail(dto.email);
    if (!user || !(await verifyPassword(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Accounts with TOTP enabled (and the feature flag on) stop here — the
    // session is only issued after the challenge is verified. Users who have
    // NOT set 2FA up yet still get a session; the web middleware funnels them
    // to the setup page instead.
    if (this.config.get<boolean>('app.twoFactor.enabled') && user.twoFactorEnabled) {
      const challengeId = await this.twoFactor.issueLoginChallenge(user.id);
      return { twoFactorRequired: true, challengeId };
    }
    return this.issueTokens(user, generateTokenFamily());
  }

  /**
   * Self-service registration — only when enabled via config (the kit defaults to
   * admin-provisioned). New accounts get the USER role only (no privilege
   * escalation) and are logged in immediately.
   */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    if (!this.config.get<boolean>('app.registration.enabled')) {
      throw new ForbiddenException('Registration is disabled');
    }
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);
    if (existing) throw new ConflictException('Email is already registered');

    const user = await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({
          name: dto.name,
          email: dto.email,
          password: await hashPassword(dto.password),
        })
        .returning();
      const [userRole] = await tx
        .select({ id: rolesTable.id })
        .from(rolesTable)
        .where(eq(rolesTable.name, UserRole.USER))
        .limit(1);
      if (!userRole) throw new NotFoundException('Record not found');
      await tx.insert(userRoles).values({ userId: row.id, roleId: userRole.id });
      return row;
    });
    const userWithRoles: UserRowWithRoles = {
      ...user,
      roles: await roleNamesFor(this.db, user.id),
    };
    // Keep the admin users list cache fresh (registration bypasses UsersService).
    await this.users.invalidateList();
    // Welcome notification (fire-and-forget — never block registration on it).
    this.notifications
      .create(user.id, {
        title: 'Welcome aboard!',
        body: `Hi ${user.name}, your account is ready.`,
        type: 'success',
      })
      .catch(() => {});
    this.logger.log(`New user registered: ${user.email}`);
    return this.issueTokens(userWithRoles, generateTokenFamily());
  }

  /**
   * Rotate the refresh token. Implements reuse detection: a token is revoked the
   * moment it is rotated (revokedAt set) but kept on record. If an already-revoked
   * token is presented again, that signals theft — the entire family is wiped.
   */
  async refresh(rawToken: string | undefined): Promise<AuthTokens> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');

    const [stored] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(rawToken)))
      .limit(1);
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking token family`,
      );
      await this.db.delete(refreshTokens).where(eq(refreshTokens.familyId, stored.familyId));
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      await this.db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
      throw new UnauthorizedException('Expired refresh token');
    }

    await this.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, stored.id));

    const [userRow] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);
    if (!userRow) throw new UnauthorizedException('Invalid refresh token');
    const user: UserRowWithRoles = {
      ...userRow,
      roles: await roleNamesFor(this.db, stored.userId),
    };
    return this.issueTokens(user, stored.familyId);
  }

  /** Revoke the whole family the token belongs to. Idempotent — never throws. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const [stored] = await this.db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashToken(rawToken)))
      .limit(1);
    if (stored) {
      await this.db.delete(refreshTokens).where(eq(refreshTokens.familyId, stored.familyId));
    }
  }

  /**
   * Begin a password reset. Always resolves the same way whether or not the email
   * exists (no account enumeration). For a known user we issue a single-use,
   * time-boxed token (only its hash is stored) and email the reset link.
   */
  async forgotPassword(email: string): Promise<void> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // One active token per user — drop any prior unused ones.
    await this.db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    const rawToken = generateOpaqueToken();
    const ttlMinutes = this.config.get<number>('app.passwordReset.ttlMinutes') ?? 30;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.db
      .insert(passwordResetTokens)
      .values({ userId: user.id, tokenHash: hashToken(rawToken), expiresAt });

    const baseUrl =
      this.config.get<string>('app.passwordReset.url') ?? 'http://localhost:4300/reset-password';
    const resetUrl = `${baseUrl}?token=${rawToken}`;

    // Never let a mail failure change the response (would leak account existence).
    try {
      await this.mail.send({
        to: user.email,
        subject: 'Reset your password',
        text:
          `Hi ${user.name},\n\n` +
          `We received a request to reset your password. Use the link below ` +
          `(valid for ${ttlMinutes} minutes):\n\n${resetUrl}\n\n` +
          `If you didn't request this, you can safely ignore this email.`,
      });
    } catch (err) {
      this.logger.error(`Failed to send password reset email: ${(err as Error).message}`);
    }
  }

  /**
   * Complete a password reset. Validates the token (exists, unused, unexpired),
   * sets the new password, marks the token spent, and revokes every refresh token
   * so any existing sessions are forced to re-authenticate.
   */
  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const [stored] = await this.db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, hashToken(rawToken)))
      .limit(1);
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.db.transaction(async (tx) => {
      await tx.update(users).set({ password: passwordHash }).where(eq(users.id, stored.userId));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, stored.id));
      await tx.delete(refreshTokens).where(eq(refreshTokens.userId, stored.userId));
    });
    this.logger.log(`Password reset completed for user ${stored.userId}`);
  }

  /** Days the refresh token (and its cookie) stays valid. */
  get refreshTtlDays(): number {
    return this.config.get<number>('app.jwt.refreshExpiresInDays') ?? 7;
  }

  /**
   * Issue a brand-new session for an already-verified user — used by the 2FA
   * and passkey login completions, where the password/credential check happens
   * in a dedicated service before tokens may be minted.
   */
  async issueSession(user: UserWithRoles): Promise<AuthTokens> {
    return this.issueTokens(user, generateTokenFamily());
  }

  /** Full row (password included — verifyPassword needs it) + role names. */
  private async findUserByEmail(email: string): Promise<UserRowWithRoles | null> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return null;
    return { ...user, roles: await roleNamesFor(this.db, user.id) };
  }

  private async issueTokens(user: UserWithRoles, familyId: string): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles.map((r) => r.name),
    };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    await this.db
      .insert(refreshTokens)
      .values({ userId: user.id, familyId, tokenHash: hashToken(refreshToken), expiresAt });

    return { accessToken, refreshToken, user: toSessionUser(user) };
  }
}
