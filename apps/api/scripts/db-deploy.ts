import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { UserRole } from '@nuxion/shared-types';
import { roles } from '../src/db/schema';

config({ path: ['../../.env', '.env'] });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for deployment migrations');
const db = drizzle(databaseUrl);

try {
  await migrate(db, { migrationsFolder: './drizzle' });
  await db
    .insert(roles)
    .values(Object.values(UserRole).map((name) => ({ name })))
    .onConflictDoNothing();
  console.log('Deployment database ready: migrations applied and builtin roles ensured.');
} finally {
  await db.$client.end();
}
