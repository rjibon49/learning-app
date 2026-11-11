
import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import {
  PrismaClient,
} from '../src/generated/prisma/client.js';

// ==========================================
// Database Connection
// ==========================================

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not configured',
  );
}

const url = new URL(databaseUrl);

if (url.pathname.replace(/^\//, '') !== 'learning_app') {
  throw new Error(
    'Seed refused: unexpected database name',
  );
}

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

// ==========================================
// German Applications
// ==========================================

const germanApps = [
  {
    code: 'A1',
    name: 'German A1',
    slug: 'german-a1',
  },
  {
    code: 'A2',
    name: 'German A2',
    slug: 'german-a2',
  },
  {
    code: 'B1',
    name: 'German B1',
    slug: 'german-b1',
  },
  {
    code: 'B2',
    name: 'German B2',
    slug: 'german-b2',
  },
  {
    code: 'C1',
    name: 'German C1',
    slug: 'german-c1',
  },
] as const;

async function main(): Promise<void> {
  console.log('====================================');
  console.log('GERMAN APPLICATION SEED');
  console.log('====================================');

  // ========================================
  // 1. Resolve German Language
  // ========================================

  const germanLanguage =
    await prisma.language.findUnique({
      where: {
        code: 'de',
      },
    });

  if (!germanLanguage || !germanLanguage.isActive) {
    throw new Error(
      'German language is missing or inactive. Run seed-global.ts first.',
    );
  }

  // ========================================
  // 2. Resolve CEFR Framework
  // ========================================

  const cefr =
    await prisma.proficiencyFramework.findUnique({
      where: {
        code: 'CEFR',
      },
    });

  if (!cefr || !cefr.isActive) {
    throw new Error(
      'CEFR framework is missing or inactive',
    );
  }

  // ========================================
  // 3. Create German Applications
  // ========================================

  for (const app of germanApps) {
    const level =
      await prisma.proficiencyLevel.findUnique({
        where: {
          frameworkId_code: {
            frameworkId: cefr.id,
            code: app.code,
          },
        },
      });

    if (!level) {
      throw new Error(
        `Missing proficiency level: ${app.code}`,
      );
    }

    const assignment =
      await prisma.languageProficiencyLevel
        .findUnique({
          where: {
            languageId_levelId: {
              languageId: germanLanguage.id,
              levelId: level.id,
            },
          },
        });

    if (!assignment?.isActive) {
      throw new Error(
        `German ${app.code} is not enabled`,
      );
    }

    const savedApp = await prisma.app.upsert({
      where: {
        slug: app.slug,
      },

      update: {
        name: app.name,
        languageId: germanLanguage.id,
        levelId: level.id,
      },

      create: {
        name: app.name,
        slug: app.slug,
        description:
          `Learn German at ${app.code} level`,

        languageId: germanLanguage.id,
        levelId: level.id,

        isActive: true,

        config: {
          create: {
            adsEnabled: true,
            subscriptionsEnabled: true,
            guestModeEnabled: true,
            loginRequired: false,

            defaultLanguage: 'en',
            supportedLanguages: [
              'en',
              'bn',
            ],
          },
        },
      },
    });

    // Ensure configuration exists.
    // Existing admin-customized config is preserved.
    await prisma.appConfig.upsert({
      where: {
        appId: savedApp.id,
      },

      update: {},

      create: {
        appId: savedApp.id,

        adsEnabled: true,
        subscriptionsEnabled: true,
        guestModeEnabled: true,
        loginRequired: false,

        defaultLanguage: 'en',
        supportedLanguages: [
          'en',
          'bn',
        ],
      },
    });

    console.log(
      `App ready: ${app.name} (${savedApp.id})`,
    );
  }

  // ========================================
  // 4. Final Verification
  // ========================================

  const apps = await prisma.app.findMany({
    where: {
      languageId: germanLanguage.id,
      slug: {
        in: germanApps.map((app) => app.slug),
      },
    },

    include: {
      level: true,
      config: true,
    },

    orderBy: {
      name: 'asc',
    },
  });

  if (apps.length !== germanApps.length) {
    throw new Error(
      'German app seed verification failed',
    );
  }

  console.log('====================================');
  console.log('GERMAN APPS SEED COMPLETED');
  console.log(`Total German apps: ${apps.length}`);
  console.log('====================================');
}

main()
  .catch((error: unknown) => {
    console.error(
      'German app seed failed:',
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
