import { LearnerAccountDeletionService } from '../learner-auth/account-deletion.service.js';
import type { PrismaService } from '../prisma.service.js';
import { UsersService } from './users.service.js';

type Args = { select?: Record<string, unknown> };

describe('UsersService', () => {
  it('never selects passwordHash when listing learners', async () => {
    let seen: Args | undefined;

    const prisma = {
      user: {
        findMany: async (args: Args) => {
          seen = args;
          return [];
        },
      },
    } as unknown as PrismaService;

    const service = new UsersService(
      prisma,
      new LearnerAccountDeletionService(prisma),
    );

    await service.findAllUsers({ skip: 0, take: 100 });

    expect(seen?.select).toBeDefined();
    expect(seen?.select).not.toHaveProperty('passwordHash');
    expect(seen?.select).toHaveProperty('email', true);
  });
});

describe('LearnerAccountDeletionService', () => {
  function prismaWith(payments: number, refunds: number) {
    const calls: string[] = [];
    const model = (name: string) =>
      new Proxy(
        {},
        {
          get: (_t, method: string) => async () => {
            calls.push(`${name}.${method}`);
            if (method === 'count') {
              return name === 'paymentTransaction' ? payments : refunds;
            }
            return { id: 'u1' };
          },
        },
      );

    const prisma = new Proxy(
      {
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
          fn(prisma),
      } as Record<string, unknown>,
      {
        get: (target, key: string) => target[key] ?? model(key),
      },
    );

    return { prisma: prisma as unknown as PrismaService, calls };
  }

  it('hard deletes a learner with no payments', async () => {
    const { prisma, calls } = prismaWith(0, 0);

    const result = await new LearnerAccountDeletionService(prisma).deleteAccount('u1');

    expect(result.mode).toBe('deleted');
    expect(calls).toContain('user.delete');
  });

  it('anonymises a learner who has payment records', async () => {
    const { prisma, calls } = prismaWith(2, 0);

    const result = await new LearnerAccountDeletionService(prisma).deleteAccount('u1');

    expect(result.mode).toBe('anonymized');
    expect(calls).not.toContain('user.delete');
    expect(calls).toContain('user.update');
    expect(calls).toContain('userSession.deleteMany');
  });
});
