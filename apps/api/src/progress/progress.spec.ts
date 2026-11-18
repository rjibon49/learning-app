import type { PrismaService } from '../prisma.service.js';
import { ProgressService } from './progress.service.js';

const LEARNER = 'ckz1x2y3z0000abcdefghijkl';
const LESSON = 'ckz1x2y3z0001abcdefghijkl';

/**
 * Regression: the row lock used `user` while the table is `User`.
 * MySQL on Linux is case-sensitive, so every progress write returned 500
 * in production while working on Windows/macOS dev machines.
 */
describe('ProgressService learner lock', () => {
  function setup() {
    const rawSql: string[] = [];

    const tx = new Proxy({} as Record<string, unknown>, {
      get(_t, key: string) {
        if (key === '$queryRaw') {
          return async (strings: TemplateStringsArray) => {
            rawSql.push(strings.join('?'));
            return [];
          };
        }
        // Every model method: findUnique -> null, others -> a plain row.
        return new Proxy({}, {
          get: (_m, method: string) => async () =>
            method === 'findUnique'
              ? null
              : { id: 'x', currentStreak: 0, longestStreak: 0, completion: 100 },
        });
      },
    });

    const prisma = {
      lesson: { findFirst: async () => ({ id: LESSON }) },
      $transaction: async (fn: (t: unknown) => Promise<unknown>) => fn(tx),
    } as unknown as PrismaService;

    return { service: new ProgressService(prisma), rawSql };
  }

  it('locks the `User` table (exact case) when a lesson is finished', async () => {
    const { service, rawSql } = setup();

    await service.updateLessonProgress(LEARNER, { lessonId: LESSON, completion: 100 });

    expect(rawSql.length).toBeGreaterThan(0);
    for (const sql of rawSql) {
      expect(sql).toContain('FROM `User`');
      expect(sql).not.toMatch(/FROM `user`/);
    }
  });
});
