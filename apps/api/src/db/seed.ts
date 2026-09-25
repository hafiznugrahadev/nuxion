import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../common/utils/password';
import { roles, userRoles, users } from './schema';

// Single root .env (cwd = apps/api when run via `bun run --filter`). Env vars win.
config({ path: ['../../.env', '.env'] });

const db = drizzle(process.env.DATABASE_URL!);

async function upsertRole(name: string) {
  const [existing] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(roles).values({ name }).onConflictDoNothing().returning();
  if (created) return created;
  // Lost an insert race — re-read the winner.
  const [row] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  return row;
}

/** Insert-or-reuse the user, then replace its role links (`set` semantics —
 *  re-seeds stay idempotent). */
async function upsertUserWithRoles(
  email: string,
  name: string,
  password: string,
  roleIds: string[],
) {
  let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) {
    [user] = await db
      .insert(users)
      .values({ email, name, password })
      .onConflictDoNothing()
      .returning();
    if (!user) {
      [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    }
  }
  await db.delete(userRoles).where(eq(userRoles.userId, user.id));
  await db.insert(userRoles).values(roleIds.map((roleId) => ({ userId: user.id, roleId })));
  return user;
}

async function main() {
  // Roles are data (M2M). Upsert the well-known ones; add more rows freely.
  const [superRole, adminRole, userRole] = await Promise.all([
    upsertRole('SUPER_ADMIN'),
    upsertRole('ADMIN'),
    upsertRole('USER'),
  ]);

  // Super admin manages users (CRUD).
  const superAdmin = await upsertUserWithRoles(
    'superadmin@nuxion.test',
    'Super Admin',
    await hashPassword('super1234'),
    [superRole.id, adminRole.id, userRole.id],
  );

  // Admin holds two roles (demonstrates a multi-role user).
  const admin = await upsertUserWithRoles(
    'admin@nuxion.test',
    'Admin',
    await hashPassword('admin123'),
    [adminRole.id, userRole.id],
  );

  const user = await upsertUserWithRoles(
    'user@nuxion.test',
    'Regular User',
    await hashPassword('user1234'),
    [userRole.id],
  );

  // 100 demo users so pagination (and sorting) has real volume to page
  // through. Deterministic emails keep re-seeds idempotent; a unique violation
  // (23505) on insert just means the row is already there — skipped.
  const FIRST = [
    'Andi',
    'Budi',
    'Citra',
    'Dewi',
    'Eko',
    'Fitri',
    'Galih',
    'Hana',
    'Iqbal',
    'Joko',
    'Kartika',
    'Lukman',
    'Maya',
    'Nanda',
    'Oka',
    'Putri',
    'Rizky',
    'Sari',
    'Taufik',
    'Utami',
    'Vina',
    'Wahyu',
    'Yani',
    'Zaki',
    'Agus',
    'Bella',
    'Candra',
    'Dian',
    'Erik',
    'Fajar',
    'Gita',
    'Hendra',
    'Indah',
    'Jaya',
    'Kirana',
    'Laila',
    'Marta',
    'Nadia',
    'Oscar',
    'Paramita',
    'Qori',
    'Rani',
    'Satria',
    'Tika',
    'Umar',
    'Vero',
    'Wulan',
    'Yoga',
    'Zahra',
    'Aditya',
  ];
  const LAST = [
    'Wijaya',
    'Santoso',
    'Kusuma',
    'Pratama',
    'Nugraha',
    'Saputra',
    'Halim',
    'Wibowo',
    'Maulana',
    'Firmansyah',
    'Anggraini',
    'Setiawan',
    'Hidayat',
    'Ramadhan',
    'Purnama',
  ];
  const demoHash = await hashPassword('demo1234');
  const demoRows = Array.from({ length: 100 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    // Spread createdAt over the last ~4 months so sorting by joined date is
    // visibly meaningful (one row every ~58 hours, newest at i=0).
    const createdAt = new Date(Date.now() - i * 58 * 60 * 60 * 1000);
    return {
      email: `demo.${String(i + 1).padStart(3, '0')}@nuxion.test`,
      name,
      password: demoHash,
      createdAt,
    };
  });

  const inserted = await db.insert(users).values(demoRows).onConflictDoNothing().returning({
    id: users.id,
    email: users.email,
  });
  // Attach roles to the freshly created demo users (every 9th is an ADMIN).
  // Index lookup is by email so partial re-seeds keep the role pattern stable.
  if (inserted.length > 0) {
    const indexByEmail = new Map(demoRows.map((r, i) => [r.email, i]));
    const links = inserted.map(({ id, email }) => ({
      userId: id,
      roleId: indexByEmail.get(email)! % 9 === 0 ? adminRole.id : userRole.id,
    }));
    await db.insert(userRoles).values(links).onConflictDoNothing();
  }

  console.log('Seed complete:', {
    superAdmin: superAdmin.email,
    admin: admin.email,
    user: user.email,
    demoUsers: inserted.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$client.end());
