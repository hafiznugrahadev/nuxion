import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { hashPassword } from '../src/common/utils/password';

// Single root .env (cwd = apps/api when run via `bun run --filter`). Env vars win.
config({ path: ['../../.env', '.env'] });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Roles are data (M2M). Upsert the well-known ones; add more rows freely.
  const [superRole, adminRole, userRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'SUPER_ADMIN' },
      update: {},
      create: { name: 'SUPER_ADMIN' },
    }),
    prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN' } }),
    prisma.role.upsert({ where: { name: 'USER' }, update: {}, create: { name: 'USER' } }),
  ]);

  // Super admin manages users (CRUD). `set` keeps re-seeds idempotent.
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@nuxion.test' },
    update: { roles: { set: [{ id: superRole.id }, { id: adminRole.id }, { id: userRole.id }] } },
    create: {
      email: 'superadmin@nuxion.test',
      name: 'Super Admin',
      password: await hashPassword('super1234'),
      roles: { connect: [{ id: superRole.id }, { id: adminRole.id }, { id: userRole.id }] },
    },
  });

  // Admin holds two roles (demonstrates a multi-role user).
  const admin = await prisma.user.upsert({
    where: { email: 'admin@nuxion.test' },
    update: { roles: { set: [{ id: adminRole.id }, { id: userRole.id }] } },
    create: {
      email: 'admin@nuxion.test',
      name: 'Admin',
      password: await hashPassword('admin123'),
      roles: { connect: [{ id: adminRole.id }, { id: userRole.id }] },
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@nuxion.test' },
    update: { roles: { set: [{ id: userRole.id }] } },
    create: {
      email: 'user@nuxion.test',
      name: 'Regular User',
      password: await hashPassword('user1234'),
      roles: { connect: [{ id: userRole.id }] },
    },
  });

  // 100 demo users so pagination (and sorting) has real volume to page
  // through. Deterministic emails keep re-seeds idempotent; a P2002 (unique
  // violation) on create just means the row is already there — skip it.
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
  let seeded = 0;
  for (let i = 0; i < 100; i++) {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
    // Spread createdAt over the last ~4 months so sorting by joined date is
    // visibly meaningful (one row every ~58 hours, newest at i=0).
    const createdAt = new Date(Date.now() - i * 58 * 60 * 60 * 1000);
    try {
      await prisma.user.create({
        data: {
          email: `demo.${String(i + 1).padStart(3, '0')}@nuxion.test`,
          name,
          password: demoHash,
          createdAt,
          roles: { connect: [{ id: i % 9 === 0 ? adminRole.id : userRole.id }] },
        },
      });
      seeded++;
    } catch {
      // Already seeded — keep the loop idempotent.
    }
  }

  console.log('Seed complete:', {
    superAdmin: superAdmin.email,
    admin: admin.email,
    user: user.email,
    demoUsers: seeded,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
