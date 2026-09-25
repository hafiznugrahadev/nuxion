import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Same precedence as the app: real env vars win over the root .env file.
config({ path: ['../../.env', '.env'] });

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
