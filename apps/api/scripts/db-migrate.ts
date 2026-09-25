import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// Single root .env (cwd = apps/api). Env vars win over the file.
config({ path: ['../../.env', '.env'] });

// Programmatic migrator used by the dev/prod entrypoints (drizzle-kit CLI is a
// devDependency — the runtime image only needs drizzle-orm). Runs with bun.
const db = drizzle(process.env.DATABASE_URL!);

await migrate(db, { migrationsFolder: './drizzle' });
console.log('› Database migrations applied');

await db.$client.end();
