import { Logger } from '@nestjs/common';
import type { MailMessage, MailTransport } from '../mail.types';

/**
 * Dev transport (default, zero-infra). Logs the email instead of sending it, so
 * flows like password reset are fully testable without an SMTP server — the reset
 * link appears in the API logs. Set MAIL_TRANSPORT=smtp to actually deliver.
 */
export class LogMailTransport implements MailTransport {
  private readonly logger = new Logger('MailService');

  async send(message: MailMessage, from: string): Promise<void> {
    this.logger.log(
      `[log transport] email NOT sent (set MAIL_TRANSPORT=smtp to deliver)\n` +
        `  from:    ${from}\n` +
        `  to:      ${message.to}\n` +
        `  subject: ${message.subject}\n` +
        `  ---\n  ${message.text.replace(/\n/g, '\n  ')}`,
    );
  }
}
