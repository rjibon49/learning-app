import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not configured');
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

const prisma = new PrismaClient({
  adapter,
});

const apps = [
  {
    level: 'A1' as const,
    name: 'German A1',
    slug: 'german-a1',
  },
  {
    level: 'A2' as const,
    name: 'German A2',
    slug: 'german-a2',
  },
  {
    level: 'B1' as const,
    name: 'German B1',
    slug: 'german-b1',
  },
  {
    level: 'B2' as const,
    name: 'German B2',
    slug: 'german-b2',
  },
  {
    level: 'C1' as const,
    name: 'German C1',
    slug: 'german-c1',
  },
];

async function main() {
  console.log('Starting database seed...');

  for (const app of apps) {
    await prisma.app.upsert({
      where: {
        level: app.level,
      },
      update: {
        name: app.name,
        slug: app.slug,
        isActive: true,
      },
      create: {
        level: app.level,
        name: app.name,
        slug: app.slug,
        isActive: true,
      },
    });

    console.log(`Seeded ${app.level}`);
  }

  console.log('Database seed completed.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });