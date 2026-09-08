import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT, type MailMessage, type MailTransport } from './mail.types';

/**
 * Public mail facade (mirrors RedisService / StorageService). Holds the `from`
 * address from config and delegates delivery to the active transport. Inject this
 * anywhere; the MailModule is @Global.
 */
@Injectable()
export class MailService {
  private readonly from: string;

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
    config: ConfigService,
  ) {
    this.from = config.get<string>('mail.from') ?? 'Nuxion <no-reply@nuxion.test>';
  }

  send(message: MailMessage): Promise<void> {
    return this.transport.send(message, this.from);
  }
}
