import { BadRequestException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import type { NuxionAuth } from './better-auth.factory';

export const BETTER_AUTH = Symbol('BETTER_AUTH');

@Injectable()
export class BetterAuthService {
  constructor(@Inject(BETTER_AUTH) private readonly auth: NuxionAuth) {}

  async verifyPassword(password: string, hash: string) {
    const context = await this.auth.$context;
    return context.password.verify({ password, hash });
  }

  async issueSession(userId: string, incoming: IncomingHttpHeaders) {
    const { headers } = await this.auth.api.issueVerifiedSession({
      body: { userId },
      headers: await this.headers(incoming),
      returnHeaders: true,
    });
    return headers.getSetCookie();
  }

  async getSession(incoming: IncomingHttpHeaders) {
    const result = await this.auth.api.getSession({
      headers: await this.headers(incoming),
      returnHeaders: true,
    });
    if (!result.response) throw new UnauthorizedException('Session expired or missing');
    return { userId: result.response.user.id, cookies: result.headers.getSetCookie() };
  }

  async logout(incoming: IncomingHttpHeaders) {
    const result = await this.auth.api.signOut({
      headers: await this.headers(incoming),
      returnHeaders: true,
    });
    return result.headers.getSetCookie();
  }

  async forgotPassword(userId: string) {
    await this.auth.api.requestLegacyPasswordReset({ body: { userId } });
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      await this.auth.api.resetPassword({ body: { token, newPassword } });
    } catch (error) {
      const { APIError } = await import('better-auth/api');
      if (error instanceof APIError)
        throw new BadRequestException('Invalid or expired reset token');
      throw error;
    }
  }

  private async headers(incoming: IncomingHttpHeaders) {
    const { fromNodeHeaders } = await import('better-auth/node');
    return fromNodeHeaders(incoming);
  }
}
