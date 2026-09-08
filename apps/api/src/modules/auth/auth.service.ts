import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@nuxion/shared-types';
import { PrismaService } from '@infrastructure/database/prisma.service';
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
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  roles: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly users: UsersService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });
    if (!user || !(await verifyPassword(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
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
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: await hashPassword(dto.password),
        roles: { connect: [{ name: UserRole.USER }] },
      },
      include: { roles: true },
    });
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
    return this.issueTokens(user, generateTokenFamily());
  }

  /**
   * Rotate the refresh token. Implements reuse detection: a token is revoked the
   * moment it is rotated (revokedAt set) but kept on record. If an already-revoked
   * token is presented again, that signals theft — the entire family is wiped.
   */
  async refresh(rawToken: string | undefined): Promise<AuthTokens> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      include: { user: { include: { roles: true } } },
    });
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.revokedAt) {
      this.logger.warn(
        `Refresh token reuse detected for user ${stored.userId}; revoking token family`,
      );
      await this.prisma.refreshToken.deleteMany({ where: { familyId: stored.familyId } });
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Expired refresh token');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.user, stored.familyId);
  }

  /** Revoke the whole family the token belongs to. Idempotent — never throws. */
  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return;
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
      select: { familyId: true },
    });
    if (stored) {
      await this.prisma.refreshToken.deleteMany({ where: { familyId: stored.familyId } });
    }
  }

  /**
   * Begin a password reset. Always resolves the same way whether or not the email
   * exists (no account enumeration). For a known user we issue a single-use,
   * time-boxed token (only its hash is stored) and email the reset link.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.logger.log(`Password reset requested for unknown email: ${email}`);
      return;
    }

    // One active token per user — drop any prior unused ones.
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

    const rawToken = generateOpaqueToken();
    const ttlMinutes = this.config.get<number>('app.passwordReset.ttlMinutes') ?? 30;
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: hashToken(rawToken), expiresAt },
    });

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
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: stored.userId }, data: { password: passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({ where: { userId: stored.userId } }),
    ]);
    this.logger.log(`Password reset completed for user ${stored.userId}`);
  }

  /** Days the refresh token (and its cookie) stays valid. */
  get refreshTtlDays(): number {
    return this.config.get<number>('app.jwt.refreshExpiresInDays') ?? 7;
  }

  private async issueTokens(
    user: {
      id: string;
      email: string;
      name: string;
      avatarUrl: string | null;
      roles: { name: string }[];
    },
    familyId: string,
  ): Promise<AuthTokens> {
    const roles = user.roles.map((r) => r.name);
    const payload: JwtPayload = { sub: user.id, email: user.email, roles };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = generateRefreshToken();
    const expiresAt = new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId: user.id, familyId, tokenHash: hashToken(refreshToken), expiresAt },
    });

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, roles },
    };
  }
}
