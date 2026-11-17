import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

/**
 * Shared by:
 *  - DELETE /api/auth/learner/me              (learner deletes own account — required by Apple App Store & Google Play)
 *  - DELETE /api/users/:id?permanent=true    (Super Admin)
 */
@Injectable()
export class LearnerAccountDeletionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Remove a learner account and all personal data.
   *
   * Learning data (progress, quiz attempts, sessions, notifications ...) is
   * deleted by the database cascade. If the learner has payment / refund
   * records, those must be kept for accounting, so the account is anonymised
   * instead of deleted.
   */
  async deleteAccount(
    id: string,
  ): Promise<{ success: true; mode: 'deleted' | 'anonymized' }> {
    const [payments, refunds] = await Promise.all([
      this.prisma.paymentTransaction.count({ where: { userId: id } }),
      this.prisma.refundRequest.count({ where: { userId: id } }),
    ]);

    if (payments + refunds === 0) {
      await this.prisma.user.delete({ where: { id }, select: { id: true } });
      return { success: true, mode: 'deleted' };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.userSession.deleteMany({ where: { userId: id } });
      await tx.passwordResetToken.deleteMany({ where: { userId: id } });
      await tx.pushDevice.deleteMany({ where: { userId: id } });
      await tx.lessonProgress.deleteMany({ where: { userId: id } });
      await tx.vocabularyProgress.deleteMany({ where: { userId: id } });
      await tx.quizAttempt.deleteMany({ where: { userId: id } });
      await tx.userActivity.deleteMany({ where: { userId: id } });
      await tx.userNotification.deleteMany({ where: { userId: id } });
      await tx.notificationPreference.deleteMany({ where: { userId: id } });
      await tx.userLanguageEnrollment.deleteMany({ where: { userId: id } });

      await tx.user.update({
        where: { id },
        data: {
          email: null,
          displayName: 'Deleted user',
          passwordHash: null,
          phoneNumber: null,
          referralCode: null,
          isActive: false,
          emailVerifiedAt: null,
        },
      });
    });

    return { success: true, mode: 'anonymized' };
  }
}
