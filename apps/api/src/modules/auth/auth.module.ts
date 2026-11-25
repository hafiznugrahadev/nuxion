import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { getDrizzleToken } from '@nestjs/drizzle';
import type { Database } from '@db/relations';
import { SessionAuthGuard } from '@common/guards/session-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { UsersModule } from '@modules/users/users.module';
import { MailService } from '@infrastructure/mail/mail.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { WebAuthnService } from './webauthn.service';
import { BETTER_AUTH, BetterAuthService } from './better-auth.service';
import { createBetterAuth } from './better-auth.factory';

@Module({
  imports: [UsersModule, NotificationsModule],
  controllers: [AuthController],
  providers: [
    {
      provide: BETTER_AUTH,
      inject: [getDrizzleToken(), ConfigService, MailService],
      useFactory: (db: Database, config: ConfigService, mail: MailService) =>
        createBetterAuth(db, config, mail),
    },
    BetterAuthService,
    AuthService,
    TwoFactorService,
    WebAuthnService,
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
