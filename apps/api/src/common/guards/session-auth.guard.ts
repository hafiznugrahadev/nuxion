import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { BetterAuthService } from '@modules/auth/better-auth.service';
import { AuthService } from '@modules/auth/auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly betterAuth: BetterAuthService,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest<Request & { user: AuthUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const session = await this.betterAuth.getSession(request.headers);
    request.user = await this.auth.currentUser(session.userId);
    for (const cookie of session.cookies) response.append('Set-Cookie', cookie);
    return true;
  }
}
