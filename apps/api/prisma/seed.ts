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

  console.log('Seed complete:', {
    superAdmin: superAdmin.email,
    admin: admin.email,
    user: user.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
