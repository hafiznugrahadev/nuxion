import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import { eq } from 'drizzle-orm';
import type { IncomingHttpHeaders } from 'node:http';
import { UserRole } from '@nuxion/shared-types';
import { withFieldErrors } from '@common/validation/field-exception';
import type { Database } from '@db/relations';
import { users } from '@db/schema';
import { readCredential } from '@db/auth-credentials';
import { roleNamesFor } from '@db/user-roles';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { UsersService } from '@modules/users/users.service';
import { BetterAuthService } from './better-auth.service';
import { TwoFactorService } from './two-factor.service';
import { toSessionUser, type SessionUser, type UserWithRoles } from './session-user';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export type { SessionUser } from './session-user';
export interface AuthSession {
  readonly cookies: string[];
  readonly user: SessionUser;
}
export interface TwoFactorLoginChallenge {
  readonly twoFactorRequired: true;
  readonly challengeId: string;
}
export type LoginResult = AuthSession | TwoFactorLoginChallenge;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectDrizzle() private readonly db: Database,
    private readonly config: ConfigService,
    private readonly userService: UsersService,
    private readonly twoFactor: TwoFactorService,
    private readonly betterAuth: BetterAuthService,
    private readonly notifications: NotificationsService,
  ) {}

  async login(dto: LoginDto, headers: IncomingHttpHeaders): Promise<LoginResult> {
    const [user] = await this.db.select().from(users).where(eq(users.email, dto.email)).limit(1);
    const password = user ? await readCredential(this.db, user.id) : null;
    if (!user || !password || !(await this.betterAuth.verifyPassword(dto.password, password))) {
      throw withFieldErrors(new UnauthorizedException('Invalid credentials'), [
        'email',
        'password',
      ]);
    }
    if (this.config.get<boolean>('app.twoFactor.enabled') && user.twoFactorEnabled) {
      return {
        twoFactorRequired: true,
        challengeId: await this.twoFactor.issueLoginChallenge(user.id),
      };
    }
    return this.issueSession({ ...user, roles: await roleNamesFor(this.db, user.id) }, headers);
  }

  async register(dto: RegisterDto, headers: IncomingHttpHeaders): Promise<AuthSession> {
    if (!this.config.get<boolean>('app.registration.enabled'))
      throw new ForbiddenException('Registration is disabled');
    const [existing] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, dto.email))
      .limit(1);
    if (existing)
      throw withFieldErrors(new ConflictException('Email is already registered'), ['email']);
    const user = await this.userService.create({ ...dto, roles: [UserRole.USER] });
    await this.notifications
      .create(user.id, {
        title: 'Welcome aboard!',
        body: `Hi ${user.name}, your account is ready.`,
        type: 'success',
      })
      .catch((error: unknown) => {
        if (!(error instanceof Error)) throw error;
        this.logger.warn('Welcome notification delivery failed');
      });
    return this.issueSession(
      {
        ...user,
        avatarUrl: user.avatarUrl ?? null,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
        roles: user.roles.map((name) => ({ name })),
      },
      headers,
    );
  }

  async currentUser(id: string): Promise<SessionUser> {
    const user = await this.userService.findOne(id);
    return toSessionUser({
      ...user,
      avatarUrl: user.avatarUrl ?? null,
      twoFactorEnabled: user.twoFactorEnabled ?? false,
      roles: user.roles.map((name) => ({ name })),
    });
  }

  async issueSession(user: UserWithRoles, headers: IncomingHttpHeaders): Promise<AuthSession> {
    return {
      cookies: await this.betterAuth.issueSession(user.id, headers),
      user: toSessionUser(user),
    };
  }

  async logout(headers: IncomingHttpHeaders) {
    return this.betterAuth.logout(headers);
  }
  async forgotPassword(email: string) {
    if (this.config.get<boolean>('app.passwordReset.enabled') === false) {
      throw new ServiceUnavailableException('Password reset is temporarily unavailable');
    }
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (user) await this.betterAuth.forgotPassword(user.id);
  }
  async resetPassword(token: string, newPassword: string) {
    await this.betterAuth.resetPassword(token, newPassword);
  }
}
