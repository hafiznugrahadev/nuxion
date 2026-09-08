import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT, type MailTransport } from './mail.types';
import { LogMailTransport } from './transports/log.transport';
import { SmtpMailTransport, type SmtpOptions } from './transports/smtp.transport';
import { MailService } from './mail.service';

/**
 * Global mail module. The transport (log | smtp) is selected from config at
 * startup; both honour the same MailTransport contract so call-sites are
 * delivery-agnostic. Mirrors RedisModule / StorageModule (SPEC DRY #10).
 */
@Global()
@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MailTransport => {
        const transport = config.get<string>('mail.transport') ?? 'log';
        if (transport === 'smtp') {
          return new SmtpMailTransport(config.getOrThrow<SmtpOptions>('mail.smtp'));
        }
        return new LogMailTransport();
      },
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
