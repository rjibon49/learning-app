
import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  PrismaClient,
  WritingDirection,
} from '../src/generated/prisma/client.js';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing');
}

const database = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: database.hostname,
  port: Number(database.port || 3306),
  user: decodeURIComponent(database.username),
  password: decodeURIComponent(database.password),
  database: database.pathname.replace(/^\//, ''),
  connectionLimit: 2,
});

const prisma = new PrismaClient({ adapter });

// ==========================================
// Supported Languages
// ==========================================

const languages = [
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: WritingDirection.LTR },
  { code: 'en', name: 'English', nativeName: 'English', direction: WritingDirection.LTR },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: WritingDirection.LTR },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: WritingDirection.LTR },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: WritingDirection.LTR },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: WritingDirection.LTR },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: WritingDirection.RTL },
  { code: 'bn', name: 'Bangla', nativeName: 'বাংলা', direction: WritingDirection.LTR },
] as const;

// ==========================================
// Proficiency Frameworks
// ==========================================

const frameworks = [
  {
    code: 'CEFR',
    name: 'Common European Framework of Reference',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
  },
  {
    code: 'JLPT',
    name: 'Japanese Language Proficiency Test',
    levels: ['N5', 'N4', 'N3', 'N2', 'N1'],
  },
  {
    code: 'TOPIK',
    name: 'Test of Proficiency in Korean',
    levels: ['1', '2', '3', '4', '5', '6'],
  },
] as const;

// ==========================================
// Language → Framework Mapping
// ==========================================

const languageFrameworks: Record<string, string> = {
  de: 'CEFR',
  en: 'CEFR',
  fr: 'CEFR',
  es: 'CEFR',
  ja: 'JLPT',
  ko: 'TOPIK',
  ar: 'CEFR',
  bn: 'CEFR',
};

async function main(): Promise<void> {
  console.log('Starting Global Language Seed...');

  // 1. Create languages
  for (const [index, language] of languages.entries()) {
    await prisma.language.upsert({
      where: { code: language.code },

      update: {
        name: language.name,
        nativeName: language.nativeName,
        direction: language.direction,
      },

      create: {
        ...language,
        sortOrder: index,
        isActive: true,
      },
    });
  }

  // 2. Create frameworks and levels
  for (const framework of frameworks) {
    const savedFramework =
      await prisma.proficiencyFramework.upsert({
        where: { code: framework.code },

        update: {
          name: framework.name,
        },

        create: {
          code: framework.code,
          name: framework.name,
        },
      });

    for (const [index, code] of framework.levels.entries()) {
      await prisma.proficiencyLevel.upsert({
        where: {
          frameworkId_code: {
            frameworkId: savedFramework.id,
            code,
          },
        },

        update: {
          name: code,
          sortOrder: index,
        },

        create: {
          frameworkId: savedFramework.id,
          code,
          name: code,
          sortOrder: index,
        },
      });
    }
  }

  // 3. Link language and proficiency levels
  for (const [languageCode, frameworkCode] of
    Object.entries(languageFrameworks)) {

    const language = await prisma.language.findUniqueOrThrow({
      where: { code: languageCode },
    });

    const framework =
      await prisma.proficiencyFramework.findUniqueOrThrow({
        where: { code: frameworkCode },
        include: {
          levels: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

    for (const [index, level] of framework.levels.entries()) {
      await prisma.languageProficiencyLevel.upsert({
        where: {
          languageId_levelId: {
            languageId: language.id,
            levelId: level.id,
          },
        },

        update: {
          isActive: true,
          sortOrder: index,
        },

        create: {
          languageId: language.id,
          levelId: level.id,
          isActive: true,
          sortOrder: index,
        },
      });
    }
  }

  // 4. Verify seeded records
  const results = {
    languages: await prisma.language.count(),
    frameworks: await prisma.proficiencyFramework.count(),
    levels: await prisma.proficiencyLevel.count(),
    languageLevels: await prisma.languageProficiencyLevel.count(),
  };

  console.log('====================================');
  console.log('GLOBAL LANGUAGE SEED COMPLETED');
  console.log('====================================');
  console.log(results);
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });