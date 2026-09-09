import { registerAs } from '@nestjs/config';
import type { MattermostLogLevel } from '@infrastructure/logging/mattermost.transport';

/**
 * Strongly-typed Mattermost log-driver config namespace — reads process.env
 * directly (like app.config). Flow: .env → validateEnv → this namespace →
 * ConfigService → the pino stream in infrastructure/logging.
 */
export type { MattermostLogLevel };
export const mattermostConfig = registerAs('mattermost', () => ({
  // Toggle for the whole driver; dev defaults off.
  enabled: (process.env.MATTERMOST_LOG_ENABLED ?? 'false') === 'true',
  // Mattermost Incoming Webhook URL — validated as required when enabled.
  webhookUrl: process.env.MATTERMOST_LOG_WEBHOOK_URL || undefined,
  // Minimum level forwarded to Mattermost (error = only error+fatal).
  level: (process.env.MATTERMOST_LOG_LEVEL ?? 'error') as MattermostLogLevel,
  // Optional channel override (webhook's default channel is used otherwise).
  channel: process.env.MATTERMOST_LOG_CHANNEL || undefined,
  username: process.env.MATTERMOST_LOG_USERNAME || 'Nuxion API',
  // Don't forward pino-http's automatic per-request access logs.
  skipHttp: (process.env.MATTERMOST_LOG_SKIP_HTTP ?? 'true') !== 'false',
}));

export type MattermostConfig = ReturnType<typeof mattermostConfig>;
