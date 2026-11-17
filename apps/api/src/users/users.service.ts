import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma.service.js';
import { LearnerAccountDeletionService } from '../learner-auth/account-deletion.service.js';

/**
 * Fields that are safe to send to the Admin CMS.
 * NEVER return the full User row: it contains passwordHash.
 */
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  displayName: true,
  phoneNumber: true,
  role: true,
  isActive: true,
  emailVerifiedAt: true,
  referralCode: true,
  referredById: true,
  adFreeUntil: true,
  currentStreak: true,
  longestStreak: true,
  lastActivityDate: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      lessonProgress: true,
      vocabularyProgress: true,
      quizAttempts: true,
    },
  },
} satisfies Prisma.UserSelect;

export type UserListQuery = {
  search?: string;
  isActive?: boolean;
  skip: number;
  take: number;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountDeletion: LearnerAccountDeletionService,
  ) {}

  /** Returns an array (kept for Admin CMS compatibility), max 500 rows per call. */
  findAllUsers(query: UserListQuery) {
    const where: Prisma.UserWhereInput = {
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search } },
              { displayName: { contains: query.search } },
            ],
          }
        : {}),
    };

    return this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: query.skip,
      take: query.take,
      select: SAFE_USER_SELECT,
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async setStatus(id: string, isActive: boolean) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id },
        data: { isActive },
        select: SAFE_USER_SELECT,
      });

      // A blocked learner must be logged out on every device.
      if (!isActive) {
        await tx.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return user;
    });
  }

  async deleteLearnerAccount(id: string) {
    await this.findOne(id);
    return this.accountDeletion.deleteAccount(id);
  }
}
