import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Single root .env (CLI runs with cwd = apps/api). Existing env vars win.
config({ path: ['../../.env', '.env'] });

/**
 * Prisma 7 config (replaces the deprecated package.json `prisma` key). The CLI no
 * longer auto-loads .env, so we load the monorepo-root file above. Seed runs via bun.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'bun run prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
