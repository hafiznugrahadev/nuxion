import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from '../mail.types';

/**
 * Development delivery sink. Message content and addresses stay out of logs.
 */
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('MailService');

  async send(_message: MailMessage, _from: string): Promise<void> {
    this.logger.log('[log transport] email delivery skipped; configure SMTP to deliver');
  }
}
