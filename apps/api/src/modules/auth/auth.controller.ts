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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '@common/decorators/public.decorator';
import { CurrentUser, type AuthUser } from '@common/decorators/current-user.decorator';
import { AuthService, type AuthTokens } from './auth.service';
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

/** httpOnly cookie holding the opaque refresh token — never readable from JS. */
const REFRESH_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookiePath: string;

  constructor(
    private readonly authService: AuthService,
    private readonly twoFactor: TwoFactorService,
    private readonly webAuthn: WebAuthnService,
    private readonly config: ConfigService,
  ) {
    const prefix = this.config.get<string>('app.apiPrefix') ?? 'api';
    this.cookiePath = `/${prefix}/auth`;
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login; returns a session or a 2FA challenge' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto);
    if ('twoFactorRequired' in result) {
      // Password OK, but TOTP is enabled — no tokens/cookie until the challenge
      // is verified. ResponseInterceptor still wraps this as usual.
      return result;
    }
    return this.respondWithTokens(result, res);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Self-service registration (when enabled); returns a session' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.register(dto);
    return this.respondWithTokens(tokens, res);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const tokens = await this.authService.refresh(raw);
    return this.respondWithTokens(tokens, res);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the refresh token and clear the cookie' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    await this.authService.logout(raw);
    res.clearCookie(REFRESH_COOKIE, { path: this.cookiePath });
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  // ── Two-factor auth (TOTP) ──────────────────────────────────────────────────

  @Post('2fa/setup')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Begin TOTP setup — returns otpauth URL, QR code and secret' })
  beginTwoFactorSetup(@CurrentUser() user: AuthUser) {
    return this.twoFactor.beginSetup({ id: user.id, email: user.email });
  }

  @Post('2fa/activate')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm TOTP setup with a live code; returns recovery codes' })
  async activateTwoFactor(@CurrentUser() user: AuthUser, @Body() dto: ActivateTwoFactorDto) {
    return this.twoFactor.activate({ id: user.id }, dto.code);
  }

  @Post('2fa/recovery/regenerate')
  @ApiBearerAuth()
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
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.twoFactor.verifyLoginChallenge(dto.challengeId, dto.code);
    const tokens = await this.authService.issueSession(user);
    return this.respondWithTokens(tokens, res);
  }

  // ── Passkeys (WebAuthn) ─────────────────────────────────────────────────────

  @Post('webauthn/register/options')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Passkey registration options (authenticated)' })
  passkeyRegisterOptions(@CurrentUser() user: AuthUser) {
    return this.webAuthn.registrationOptions(user.id);
  }

  @Post('webauthn/register/verify')
  @ApiBearerAuth()
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
    const tokens = await this.authService.issueSession(user);
    return this.respondWithTokens(tokens, res);
  }

  @Get('passkeys')
  @ApiBearerAuth()
  @ApiOperation({ summary: "List the current user's registered passkeys" })
  listPasskeys(@CurrentUser() user: AuthUser) {
    return this.webAuthn.listPasskeys(user.id);
  }

  @Delete('passkeys/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: "Remove one of the current user's passkeys" })
  async removePasskey(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.webAuthn.removePasskey(user.id, id);
    return { success: true };
  }

  /** Set the refresh cookie and return the access token + user in the body. */
  private respondWithTokens(tokens: AuthTokens, res: Response) {
    const secure = this.config.get<boolean>('app.cookie.secure') ?? false;
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: secure ? 'none' : 'lax',
      path: this.cookiePath,
      maxAge: this.authService.refreshTtlDays * 24 * 60 * 60 * 1000,
    });
    return { accessToken: tokens.accessToken, user: tokens.user };
  }
}
