import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser, type AuthUser } from '@common/decorators/current-user.decorator';
import { AuthService, type AuthSession } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { WebAuthnService } from './webauthn.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { ActivateTwoFactorDto } from './dto/activate-two-factor.dto';
import { RegenerateRecoveryDto } from './dto/regenerate-recovery.dto';
import { VerifyPasskeyLoginDto, VerifyPasskeyRegistrationDto } from './dto/webauthn.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly twoFactor: TwoFactorService,
    private readonly webAuthn: WebAuthnService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login; returns a session or a 2FA challenge' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, req.headers);
    if ('twoFactorRequired' in result) {
      // Password OK, but TOTP is enabled — no tokens/cookie until the challenge
      // is verified. ResponseInterceptor still wraps this as usual.
      return result;
    }
    return this.respondWithSession(result, res);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-service registration (when enabled); returns a session' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const session = await this.authService.register(dto, req.headers);
    return this.respondWithSession(session, res);
  }

  @Get('session')
  @ApiOperation({ summary: 'Restore the current Better Auth cookie session' })
  async session(@CurrentUser() user: AuthUser) {
    return { user: await this.authService.currentUser(user.id) };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    for (const cookie of await this.authService.logout(req.headers))
      res.append('Set-Cookie', cookie);
    res.clearCookie('refresh_token', {
      path: `/${this.config.get<string>('app.apiPrefix') ?? 'api'}/auth`,
    });
    return { success: true };
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password-reset email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Uniform response whether or not the email exists (no account enumeration).
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset the password using a reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password has been reset. You can now sign in.' };
  }

  @Get('me')
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // ── Two-factor auth (TOTP) ──────────────────────────────────────────────────

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/setup')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin TOTP setup — returns otpauth URL, QR code and secret' })
  beginTwoFactorSetup(@CurrentUser() user: AuthUser) {
    return this.twoFactor.beginSetup({ id: user.id, email: user.email });
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/activate')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm TOTP setup with a live code; returns recovery codes' })
  async activateTwoFactor(@CurrentUser() user: AuthUser, @Body() dto: ActivateTwoFactorDto) {
    return this.twoFactor.activate({ id: user.id }, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/recovery/regenerate')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Re-mint recovery codes after re-verifying the password' })
  async regenerateRecoveryCodes(@CurrentUser() user: AuthUser, @Body() dto: RegenerateRecoveryDto) {
    const recoveryCodes = await this.twoFactor.regenerateRecoveryCodes(user.id, dto.password);
    return { recoveryCodes };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login with a TOTP or recovery code' })
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.twoFactor.verifyLoginChallenge(dto.challengeId, dto.code);
    const session = await this.authService.issueSession(user, req.headers);
    return this.respondWithSession(session, res);
  }

  // ── Passkeys (WebAuthn) ─────────────────────────────────────────────────────

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('webauthn/register/options')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Passkey registration options (authenticated)' })
  passkeyRegisterOptions(@CurrentUser() user: AuthUser) {
    return this.webAuthn.registrationOptions(user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('webauthn/register/verify')
  @ApiCookieAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Verify a passkey registration and store the credential' })
  passkeyRegisterVerify(@CurrentUser() user: AuthUser, @Body() dto: VerifyPasskeyRegistrationDto) {
    return this.webAuthn.verifyRegistration(user.id, dto.response, dto.name);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('webauthn/login/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Passkey login challenge (discoverable credentials)' })
  passkeyLoginOptions() {
    return this.webAuthn.loginOptions();
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('webauthn/login/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a passkey assertion; returns a session (or a 2FA challenge)' })
  async passkeyLoginVerify(
    @Body() dto: VerifyPasskeyLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, userVerified } = await this.webAuthn.verifyLogin(dto.challengeId, dto.response);
    // A user-verified passkey IS the second factor; without UV (e.g. a security
    // key without a touch PIN), accounts with TOTP enabled still face the OTP step.
    if (
      this.config.get<boolean>('app.twoFactor.enabled') &&
      user.twoFactorEnabled &&
      !userVerified
    ) {
      const challengeId = await this.twoFactor.issueLoginChallenge(user.id);
      return { twoFactorRequired: true as const, challengeId };
    }
    const session = await this.authService.issueSession(user, req.headers);
    return this.respondWithSession(session, res);
  }

  @Get('passkeys')
  @ApiCookieAuth()
  @ApiOperation({ summary: "List the current user's registered passkeys" })
  listPasskeys(@CurrentUser() user: AuthUser) {
    return this.webAuthn.listPasskeys(user.id);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Delete('passkeys/:id')
  @ApiCookieAuth()
  @ApiOperation({ summary: "Remove one of the current user's passkeys" })
  async removePasskey(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.webAuthn.removePasskey(user.id, id);
    return { success: true };
  }

  private respondWithSession(session: AuthSession, res: Response) {
    for (const cookie of session.cookies) res.append('Set-Cookie', cookie);
    return { user: session.user };
  }
}
