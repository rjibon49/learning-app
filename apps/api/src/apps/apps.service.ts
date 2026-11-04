import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AppsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.app.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        level: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        level: 'asc',
      },
    });
  }

  async findBySlug(slug: string) {
    const app = await this.prisma.app.findFirst({
      where: {
        slug,
        isActive: true,
      },
      select: {
        id: true,
        level: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return app;
  }
}