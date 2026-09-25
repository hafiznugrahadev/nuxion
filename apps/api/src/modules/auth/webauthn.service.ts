import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '@nestjs/drizzle';
import { desc, eq } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type { Database } from '@db/relations';
import { roleNamesFor } from '@db/user-roles';
import { passkeys, users } from '@db/schema';
import { RedisService } from '@infrastructure/redis/redis.service';
import { generateOpaqueToken } from '@common/utils/token.util';
import { PasskeyEntity } from './entities/passkey.entity';
import type { UserWithRoles } from './session-user';

const REGISTER_KEY = (userId: string) => `webauthn:reg:${userId}`;
/**
 * Login challenges are keyed by an opaque id, not the user — passkey login is
 * discoverable (usernameless), so the user is only known after verification.
 */
const LOGIN_KEY = (challengeId: string) => `webauthn:auth:${challengeId}`;

const CHALLENGE_TTL_SECONDS = 5 * 60;

@Injectable()
export class WebAuthnService {
  constructor(
    @InjectDrizzle()
    private readonly db: Database,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async registrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    this.assertEnabled();
    const [user] = await this.db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.db
      .select({ id: passkeys.id, transports: passkeys.transports })
      .from(passkeys)
      .where(eq(passkeys.userId, user.id));

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userName: user.email,
      userDisplayName: user.name,
      excludeCredentials: existing,
      authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
    });
    await this.redis.set(REGISTER_KEY(user.id), options.challenge, CHALLENGE_TTL_SECONDS);
    return options;
  }

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    name?: string,
  ): Promise<PasskeyEntity> {
    this.assertEnabled();
    const challenge = await this.redis.get<string>(REGISTER_KEY(userId));
    if (!challenge) throw new BadRequestException('Passkey registration expired — try again');

    // userVerification is "preferred" at generation; UV is enforced in the
    // business logic (2FA bypass), not here, so it must not hard-fail.
    const { verified, registrationInfo } = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origins,
      expectedRPID: this.rpId,
      requireUserVerification: false,
    });
    await this.redis.del(REGISTER_KEY(userId));

    if (!verified || !registrationInfo) {
      throw new UnauthorizedException('Passkey registration could not be verified');
    }
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    const [created] = await this.db
      .insert(passkeys)
      .values({
        id: credential.id,
        userId,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name: name?.trim() || null,
      })
      .returning();
    return this.toEntity(created);
  }

  async loginOptions(): Promise<{
    challengeId: string;
    options: PublicKeyCredentialRequestOptionsJSON;
  }> {
    this.assertEnabled();
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'preferred',
    });
    const challengeId = generateOpaqueToken();
    await this.redis.set(LOGIN_KEY(challengeId), options.challenge, CHALLENGE_TTL_SECONDS);
    return { challengeId, options };
  }

  /**
   * Verify a discoverable-credential assertion. The credential ID identifies
   * the user (no username step); on success the caller decides whether the
   * verified user verification flag satisfies a mandatory TOTP step.
   */
  async verifyLogin(
    challengeId: string,
    response: AuthenticationResponseJSON,
  ): Promise<{ user: UserWithRoles; userVerified: boolean }> {
    this.assertEnabled();
    const challenge = await this.redis.get<string>(LOGIN_KEY(challengeId));
    if (!challenge) throw new BadRequestException('Passkey challenge expired — try again');

    const [passkey] = await this.db
      .select()
      .from(passkeys)
      .where(eq(passkeys.id, response.id))
      .limit(1);
    if (!passkey) throw new UnauthorizedException('Unknown passkey');

    const { verified, authenticationInfo } = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: this.origins,
      expectedRPID: this.rpId,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports,
      },
      requireUserVerification: false,
    });
    await this.redis.del(LOGIN_KEY(challengeId));
    if (!verified) throw new UnauthorizedException('Passkey verification failed');

    await this.db
      .update(passkeys)
      .set({
        counter: BigInt(authenticationInfo.newCounter),
        deviceType: authenticationInfo.credentialDeviceType,
        backedUp: authenticationInfo.credentialBackedUp,
        lastUsedAt: new Date(),
      })
      .where(eq(passkeys.id, passkey.id));

    const [userRow] = await this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        avatarUrl: users.avatarUrl,
        twoFactorEnabled: users.twoFactorEnabled,
      })
      .from(users)
      .where(eq(users.id, passkey.userId))
      .limit(1);
    if (!userRow) throw new UnauthorizedException('Unknown passkey');

    return {
      user: { ...userRow, roles: await roleNamesFor(this.db, passkey.userId) },
      userVerified: authenticationInfo.userVerified,
    };
  }

  async listPasskeys(userId: string): Promise<PasskeyEntity[]> {
    this.assertEnabled();
    const rows = await this.db
      .select()
      .from(passkeys)
      .where(eq(passkeys.userId, userId))
      .orderBy(desc(passkeys.createdAt));
    return rows.map((p) => this.toEntity(p));
  }

  async removePasskey(userId: string, id: string): Promise<void> {
    this.assertEnabled();
    const [passkey] = await this.db.select().from(passkeys).where(eq(passkeys.id, id)).limit(1);
    if (!passkey) throw new NotFoundException('Passkey not found');
    if (passkey.userId !== userId) {
      // Don't leak other users' passkey IDs — treat foreign credentials as absent.
      throw new NotFoundException('Passkey not found');
    }
    await this.db.delete(passkeys).where(eq(passkeys.id, id));
  }

  private get rpName(): string {
    return this.config.get<string>('app.webauthn.rpName') ?? 'Nuxion';
  }

  private get rpId(): string {
    return this.config.getOrThrow<string>('app.webauthn.rpId');
  }

  private get origins(): string[] {
    return this.config.getOrThrow<string[]>('app.webauthn.origins');
  }

  private assertEnabled(): void {
    if (this.config.get<boolean>('app.passkey.enabled') !== true) {
      throw new ForbiddenException('Passkey sign-in is disabled');
    }
  }

  private toEntity(p: {
    id: string;
    name: string | null;
    transports: string[];
    deviceType: string | null;
    backedUp: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
  }): PasskeyEntity {
    return {
      id: p.id,
      name: p.name,
      transports: p.transports,
      deviceType: p.deviceType,
      backedUp: p.backedUp,
      lastUsedAt: p.lastUsedAt,
      createdAt: p.createdAt,
    };
  }
}
