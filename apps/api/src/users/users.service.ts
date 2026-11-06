import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            lessonProgress: true,
            vocabularyProgress: true,
            quizAttempts: true,
          },
        },
      },
    });
  }

  async toggleUserStatus(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      include: {
        _count: {
          select: {
            lessonProgress: true,
            vocabularyProgress: true,
            quizAttempts: true,
          },
        },
      }
    });
  }
}