
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

import type { Prisma } from '../generated/prisma/client.js';
import type { ActivityListInput } from './activity.schemas.js';

@Injectable()
export class ActivityService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private where(
    input: ActivityListInput,
    userId?: string,
  ): Prisma.UserActivityWhereInput {
    return {
      ...(userId
        ? { userId }
        : input.userId
          ? { userId: input.userId }
          : {}),
      ...(
        input.from || input.to
          ? {
              date: {
                ...(input.from
                  ? { gte: new Date(`${input.from}T00:00:00.000Z`) }
                  : {}),
                ...(input.to
                  ? { lte: new Date(`${input.to}T00:00:00.000Z`) }
                  : {}),
              },
            }
          : {}
      ),
    };
  }

  async findMyActivities(
    userId: string,
    query: ActivityListInput,
  ) {
    return this.list(query, userId, false);
  }

  async findAllActivitiesAdmin(
    query: ActivityListInput,
  ) {
    return this.list(query, undefined, true);
  }

  private async list(
    query: ActivityListInput,
    userId?: string,
    includeUser = false,
  ) {
    const where = this.where(query, userId);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userActivity.findMany({
        where,
        select: {
          id: true,
          userId: true,
          date: true,
          durationMinutes: true,
          isStreakCounted: true,
          createdAt: true,
          updatedAt: true,
          ...(includeUser
            ? {
                user: {
                  select: {
                    id: true,
                    email: true,
                    displayName: true,
                  },
                },
              }
            : {}),
        },
        orderBy: [
          { date: 'desc' },
          { id: 'desc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.userActivity.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
