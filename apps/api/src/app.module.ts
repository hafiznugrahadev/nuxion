import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';
import { LoggerModule } from 'nestjs-pino';
import { multistream, type Level } from 'pino';
import pretty from 'pino-pretty';
import { validateEnv } from '@config/env.validation';
import { appConfig } from '@config/app.config';
import { databaseConfig, redisConfig } from '@config/database.config';
import { storageConfig } from '@config/storage.config';
import { mailConfig } from '@config/mail.config';
import { backupConfig } from '@config/backup.config';
import {
  mattermostConfig,
  type MattermostConfig,
  type MattermostLogLevel,
} from '@config/mattermost.config';
import {
  createMattermostStream,
  lowestLogLevel,
} from '@infrastructure/logging/mattermost.transport';
import { RequestIdMiddleware } from '@common/middleware/request-id.middleware';
import { IsUniqueConstraint } from '@common/validators/is-unique.validator';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { RedisModule } from '@infrastructure/redis/redis.module';
import { StorageModule } from '@infrastructure/storage/storage.module';
import { MailModule } from '@infrastructure/mail/mail.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UsersModule } from '@modules/users/users.module';
import { FilesModule } from '@modules/files/files.module';
import { HealthModule } from '@modules/health/health.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Single source of truth: the monorepo-root .env (cwd is apps/api at runtime).
      // Real env vars (e.g. from docker-compose) still take precedence.
      envFilePath: ['../../.env'],
      validate: validateEnv,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        storageConfig,
        mailConfig,
        backupConfig,
        mattermostConfig,
      ],
    }),
    // Logger config flows from ConfigService (.env → app.config → here).
    // When the Mattermost driver is enabled, stdout/pretty becomes one entry of a
    // pino.multistream alongside the level-gated webhook stream; the logger level
    // must then be the lowest of the two streams (pino.multistream contract).
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const level = config.get<string>('app.logLevel') ?? 'info';
        const isProd = config.get<string>('app.env') === 'production';
        const customProps = (req: Request) => ({ requestId: req.headers['x-request-id'] });

        const mattermost = config.get<MattermostConfig>('mattermost');
        if (mattermost?.enabled && mattermost.webhookUrl) {
          const stream = multistream([
            {
              level: level as Level,
              stream: isProd ? process.stdout : pretty({ singleLine: true }),
            },
            {
              level: mattermost.level,
              stream: createMattermostStream({
                webhookUrl: mattermost.webhookUrl,
                channel: mattermost.channel,
                username: mattermost.username,
                skipHttp: mattermost.skipHttp,
              }),
            },
          ]);
          return {
            pinoHttp: {
              level: lowestLogLevel(level as MattermostLogLevel, mattermost.level),
              stream,
              customProps,
            },
          };
        }

        return {
          pinoHttp: {
            level,
            transport: isProd
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
            customProps,
          },
        };
      },
    }),
    // Global rate limiting (config-driven); per-route overrides via @Throttle.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('app.throttle.ttl') ?? 60_000,
            limit: config.get<number>('app.throttle.limit') ?? 100,
          },
        ],
        // Config-driven kill switch (THROTTLE_DISABLED=true) for dev/E2E/load tests.
        skipIf: () => config.get<boolean>('app.throttle.disabled') ?? false,
      }),
    }),
    PrismaModule,
    RedisModule,
    StorageModule,
    MailModule,
    AuthModule,
    UsersModule,
    FilesModule,
    HealthModule,
    NotificationsModule,
  ],
  // Provided here too so class-validator's container can resolve the async validator.
  providers: [
    IsUniqueConstraint,
    // Apply rate limiting across every route by default.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
