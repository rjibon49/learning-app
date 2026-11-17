import {
  ForbiddenException,
  Global,
  Injectable,
  Module,
} from '@nestjs/common';

import type { AuthenticatedAdmin } from '../admin-auth/admin-auth.types.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';

type Tx = Prisma.TransactionClient;

export type PermanentDeleteResult = {
  success: true;
  permanent: true;
  entityType: string;
  id: string;
};

/**
 * One place for "permanent delete" so every module behaves the same:
 *
 *  - Only SUPER_ADMIN may permanently delete.
 *  - The delete + an audit-log row run in one transaction.
 *  - Child rows with `onDelete: Cascade` are removed by the database.
 *  - If something still references the row (`onDelete: Restrict`), the database
 *    refuses and PrismaExceptionFilter returns 409 with a clear message.
 */
@Injectable()
export class PermanentDeleteService {
  constructor(private readonly prisma: PrismaService) {}

  assertAllowed(admin: AuthenticatedAdmin | undefined): AuthenticatedAdmin {
    if (!admin || admin.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Only a Super Admin can permanently delete. Use normal delete (archive) instead.',
      );
    }

    return admin;
  }

  async run(
    admin: AuthenticatedAdmin | undefined,
    entityType: string,
    id: string,
    remove: (tx: Tx) => Promise<unknown>,
    metadata?: Prisma.InputJsonObject,
  ): Promise<PermanentDeleteResult> {
    const actor = this.assertAllowed(admin);

    await this.prisma.$transaction(async (tx) => {
      await remove(tx);

      await this.audit(tx, actor, entityType, id, metadata);
    });

    return { success: true, permanent: true, entityType, id };
  }

  /** Audit-log row for a permanent delete that was done by custom logic. */
  async audit(
    tx: Tx,
    admin: AuthenticatedAdmin,
    entityType: string,
    id: string,
    metadata?: Prisma.InputJsonObject,
  ): Promise<void> {
    await tx.adminAuditLog.create({
      data: {
        adminId: admin.id,
        action: 'PERMANENT_DELETE',
        entityType,
        entityId: id,
        ...(metadata ? { metadata } : {}),
      },
    });
  }

  /** Same as `audit` but outside a transaction. */
  record(
    admin: AuthenticatedAdmin,
    entityType: string,
    id: string,
    metadata?: Prisma.InputJsonObject,
  ): Promise<void> {
    return this.audit(this.prisma, admin, entityType, id, metadata);
  }
}

@Global()
@Module({
  providers: [PermanentDeleteService],
  exports: [PermanentDeleteService],
})
export class CommonModule {}
