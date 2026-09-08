/** DI token for the active mail transport (log | smtp). */
export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Mail delivery contract. Both the dev `log` transport and the `smtp` transport
 * implement this, so call-sites never depend on how email is sent.
 */
export interface MailTransport {
  send(message: MailMessage, from: string): Promise<void>;
}
