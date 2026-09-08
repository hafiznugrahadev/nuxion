import { registerAs } from '@nestjs/config';

/**
 * Mail config namespace. Flow: .env → validateEnv → here → ConfigService.
 * Default transport is `log` (zero-infra dev — emails are logged); switch to
 * `smtp` for real delivery.
 */
export const mailConfig = registerAs('mail', () => ({
  // 'log' (default) | 'smtp'.
  transport: process.env.MAIL_TRANSPORT ?? 'log',
  from: process.env.MAIL_FROM ?? 'Nuxion <no-reply@nuxion.test>',
  smtp: {
    host: process.env.MAIL_SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.MAIL_SMTP_PORT ?? '1025', 10),
    secure: (process.env.MAIL_SMTP_SECURE ?? 'false') === 'true',
    user: process.env.MAIL_SMTP_USER,
    password: process.env.MAIL_SMTP_PASSWORD,
  },
}));

export type MailConfig = ReturnType<typeof mailConfig>;
