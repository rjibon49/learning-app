import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;
const email = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_SEED_PASSWORD;
const displayName = process.env.ADMIN_SEED_NAME?.trim() || 'Super Admin';

if (!databaseUrl) throw new Error('DATABASE_URL is not configured');
if (!email) throw new Error('ADMIN_SEED_EMAIL is required');
if (!password || password.length < 12) {
  throw new Error('ADMIN_SEED_PASSWORD must be at least 12 characters');
}

const url = new URL(databaseUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await argon2.hash(password!, {
    type: argon2.argon2id,
  });

  const admin = await prisma.adminUser.upsert({
    where: { email: email! },
    update: {
      displayName,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      passwordChangedAt: new Date(),
      authVersion: { increment: 1 },
    },
    create: {
      email: email!,
      displayName,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      passwordChangedAt: new Date(),
    },
  });

  await prisma.adminRefreshToken.deleteMany({ where: { adminId: admin.id } });

  console.log(`Super admin ready: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
