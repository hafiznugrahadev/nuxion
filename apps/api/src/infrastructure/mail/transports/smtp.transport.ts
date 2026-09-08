import type { MailMessage, MailTransport } from '../mail.types';

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
}

/** Structural view of the bits of `nodemailer` this transport uses. */
interface TransporterLike {
  sendMail(options: unknown): Promise<unknown>;
}
type CreateTransport = (options: unknown) => TransporterLike;

// Held as a `string` (not a literal) so the compiler treats `nodemailer` as a
// runtime-only, OPTIONAL dependency: deployments on the default `log` transport
// never need it. Imported lazily only when SMTP is active.
const NODEMAILER: string = 'nodemailer';

/**
 * SMTP transport via nodemailer (loaded lazily — see NODEMAILER). Works with any
 * SMTP server (Mailpit/Mailhog for dev, SES/Postmark/etc. for prod).
 */
export class SmtpMailTransport implements MailTransport {
  private transporterPromise?: Promise<TransporterLike>;

  constructor(private readonly opts: SmtpOptions) {}

  private transporter(): Promise<TransporterLike> {
    if (!this.transporterPromise) {
      this.transporterPromise = (async () => {
        const mod = (await import(NODEMAILER).catch(() => {
          throw new Error(
            'MAIL_TRANSPORT=smtp requires the "nodemailer" package. Run: bun add nodemailer',
          );
        })) as {
          createTransport?: CreateTransport;
          default?: { createTransport?: CreateTransport };
        };
        const createTransport = mod.createTransport ?? mod.default?.createTransport;
        if (!createTransport) throw new Error('nodemailer.createTransport not found');
        return createTransport({
          host: this.opts.host,
          port: this.opts.port,
          secure: this.opts.secure,
          auth:
            this.opts.user && this.opts.password
              ? { user: this.opts.user, pass: this.opts.password }
              : undefined,
        });
      })();
    }
    return this.transporterPromise;
  }

  async send(message: MailMessage, from: string): Promise<void> {
    const transporter = await this.transporter();
    await transporter.sendMail({
      from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  }
}
