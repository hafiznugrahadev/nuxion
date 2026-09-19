import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { PrismaService } from '@infrastructure/database/prisma.service';
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
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async registrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    this.assertEnabled();
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.prisma.passkey.findMany({
      where: { userId: user.id },
      select: { id: true, transports: true },
    });

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

    const created = await this.prisma.passkey.create({
      data: {
        id: credential.id,
        userId,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ?? [],
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
        name: name?.trim() || null,
      },
    });
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

    const passkey = await this.prisma.passkey.findUnique({
      where: { id: response.id },
      include: {
        user: {
          include: { roles: true },
          omit: { password: true, twoFactorSecret: true, recoveryCodes: true },
        },
      },
    });
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

    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(authenticationInfo.newCounter),
        deviceType: authenticationInfo.credentialDeviceType,
        backedUp: authenticationInfo.credentialBackedUp,
        lastUsedAt: new Date(),
      },
    });

    return { user: passkey.user, userVerified: authenticationInfo.userVerified };
  }

  async listPasskeys(userId: string): Promise<PasskeyEntity[]> {
    this.assertEnabled();
    const passkeys = await this.prisma.passkey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return passkeys.map((p) => this.toEntity(p));
  }

  async removePasskey(userId: string, id: string): Promise<void> {
    this.assertEnabled();
    const passkey = await this.prisma.passkey.findUnique({ where: { id } });
    if (!passkey) throw new NotFoundException('Passkey not found');
    if (passkey.userId !== userId) {
      // Don't leak other users' passkey IDs — treat foreign credentials as absent.
      throw new NotFoundException('Passkey not found');
    }
    await this.prisma.passkey.delete({ where: { id } });
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
