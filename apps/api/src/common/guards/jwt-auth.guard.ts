import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { AuthUser } from '../decorators/current-user.decorator';
import { ALLOW_ENROLLMENT_KEY } from '../decorators/allow-enrollment.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT guard. Routes decorated with `@Public()` bypass authentication.
 * Registered as an APP_GUARD in AuthModule so the whole API is secure-by-default.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const authenticated = await super.canActivate(context);
    const user = context.switchToHttp().getRequest<{ user: AuthUser }>().user;
    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_ENROLLMENT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (user.purpose === 'enrollment' && !allowed) {
      throw new ForbiddenException('Complete two-factor enrollment before using this resource');
    }
    return authenticated as boolean;
  }
}
