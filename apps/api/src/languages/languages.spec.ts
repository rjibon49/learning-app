import { ForbiddenException } from '@nestjs/common';

import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import { PermanentDeleteService } from '../common/permanent-delete.service.js';
import type { PrismaService } from '../prisma.service.js';
import { AdminLanguagesController } from './languages.controller.js';
import type { LanguagesService } from './languages.service.js';

const LEVEL_ID = 'ckz1x2y3z0000abcdefghijkl';

function setup() {
  const calls: string[] = [];

  const tx = {
    languageProficiencyLevel: {
      delete: async () => {
        calls.push('assignment.delete');
        return { languageId: 'lang1' };
      },
    },
    adminAuditLog: {
      create: async () => {
        calls.push('audit.create');
        return {};
      },
    },
  };

  const prisma = {
    $transaction: async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx),
  } as unknown as PrismaService;

  const languages = {
    findByCodeOrThrow: async () => ({ id: 'lang1', code: 'ja' }),
    findLevelsAdmin: async () => ({ levels: [] }),
    disableLevel: async () => {
      calls.push('disable');
      return { levels: [] };
    },
  } as unknown as LanguagesService;

  const controller = new AdminLanguagesController(
    languages,
    new PermanentDeleteService(prisma),
  );

  return { controller, calls };
}

const admin = (role: AuthenticatedAdmin['role']) =>
  ({ id: 'a1', role }) as AuthenticatedAdmin;

describe('AdminLanguagesController.removeLevel', () => {
  it('safe delete only disables the level', async () => {
    const { controller, calls } = setup();
    await controller.removeLevel('ja', LEVEL_ID, {}, admin('ADMIN'));
    expect(calls).toEqual(['disable']);
  });

  it('refuses permanent delete for a normal Admin', async () => {
    const { controller, calls } = setup();
    await expect(
      controller.removeLevel('ja', LEVEL_ID, { permanent: 'true' }, admin('ADMIN')),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(calls).toEqual([]);
  });

  it('Super Admin permanent delete removes the row and writes an audit log', async () => {
    const { controller, calls } = setup();
    await controller.removeLevel('ja', LEVEL_ID, { permanent: 'true' }, admin('SUPER_ADMIN'));
    expect(calls).toEqual(['assignment.delete', 'audit.create']);
  });
});
