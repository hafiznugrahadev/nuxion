import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { and, eq, gt, isNull } from 'drizzle-orm';
import type { Database } from '@db/relations';
import { roleNamesFor } from '@db/user-roles';
import { refreshTokens, users } from '@db/schema';
import type { AuthUser } from '@common/decorators/current-user.decorator';

export type SessionPurpose = 'full' | 'enrollment';
export type SessionAssurance = 'password' | 'mfa' | 'passkey';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
  version: number;
  family: string;
  purpose: SessionPurpose;
  assurance: SessionAssurance;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    @InjectDrizzle() private readonly db: Database,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.jwt.secret'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (
      !payload?.sub ||
      !Number.isInteger(payload.version) ||
      !payload.family ||
      !['full', 'enrollment'].includes(payload.purpose) ||
      !['password', 'mfa', 'passkey'].includes(payload.assurance)
    ) {
      throw new UnauthorizedException();
    }
    const [user] = await this.db
      .select({
        id: users.id,
        email: users.email,
        securityVersion: users.securityVersion,
      })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);
    if (!user || user.securityVersion !== payload.version) throw new UnauthorizedException();
    const [session] = await this.db
      .select({ id: refreshTokens.id })
      .from(refreshTokens)
      .where(
        and(
          eq(refreshTokens.userId, user.id),
          eq(refreshTokens.familyId, payload.family),
          eq(refreshTokens.securityVersion, payload.version),
          eq(refreshTokens.purpose, payload.purpose),
          eq(refreshTokens.assurance, payload.assurance),
          isNull(refreshTokens.revokedAt),
          gt(refreshTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (
      !session ||
      (this.config.get<boolean>('app.twoFactor.enabled') &&
        payload.purpose === 'full' &&
        payload.assurance === 'password')
    ) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      roles: (await roleNamesFor(this.db, user.id)).map((r) => r.name),
      securityVersion: user.securityVersion,
      familyId: payload.family,
      purpose: payload.purpose,
      assurance: payload.assurance,
      enrollmentRequired: payload.purpose === 'enrollment',
    };
  }
}
