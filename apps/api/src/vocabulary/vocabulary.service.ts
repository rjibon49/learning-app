import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateCategoryInput,
  CreateVocabularyInput,
  UpdateVocabularyInput,
} from './vocabulary.schemas.js';

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  async createCategory(data: CreateCategoryInput) {
    const app = await this.prisma.app.findUnique({
      where: {
        id: data.appId,
      },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return this.prisma.vocabularyCategory.create({
      data,
    });
  }

  findCategories(appId?: string) {
    return this.prisma.vocabularyCategory.findMany({
      where: appId
        ? {
            appId,
          }
        : undefined,

      orderBy: [
        {
          sortOrder: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async createVocabulary(data: CreateVocabularyInput) {
    await this.validateRelations(data);

    return this.prisma.vocabulary.create({
      data,
      include: {
        app: {
          select: {
            id: true,
            level: true,
            name: true,
            slug: true,
          },
        },

        category: true,

        lesson: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  findAll(options: {
    appId?: string;
    categoryId?: string;
    published?: boolean;
  }) {
    return this.prisma.vocabulary.findMany({
      where: {
        ...(options.appId
          ? {
              appId: options.appId,
            }
          : {}),

        ...(options.categoryId
          ? {
              categoryId: options.categoryId,
            }
          : {}),

        ...(typeof options.published === 'boolean'
          ? {
              isPublished: options.published,
            }
          : {}),
      },

      include: {
        app: {
          select: {
            id: true,
            level: true,
            name: true,
            slug: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },

      take: 100,
    });
  }

  async findOne(id: string) {
    const vocabulary =
      await this.prisma.vocabulary.findUnique({
        where: {
          id,
        },

        include: {
          app: true,
          category: true,
          lesson: true,
        },
      });

    if (!vocabulary) {
      throw new NotFoundException(
        'Vocabulary item not found',
      );
    }

    return vocabulary;
  }

  async updateVocabulary(
    id: string,
    data: UpdateVocabularyInput,
  ) {
    await this.findOne(id);

    if (
      data.appId ||
      data.categoryId ||
      data.lessonId
    ) {
      const current =
        await this.prisma.vocabulary.findUnique({
          where: {
            id,
          },
        });

      if (!current) {
        throw new NotFoundException(
          'Vocabulary item not found',
        );
      }

      await this.validateRelations({
        ...current,
        ...data,
      });
    }

    return this.prisma.vocabulary.update({
      where: {
        id,
      },

      data,
    });
  }

  async deleteVocabulary(id: string) {
    await this.findOne(id);

    await this.prisma.vocabulary.delete({
      where: {
        id,
      },
    });

    return {
      deleted: true,
      id,
    };
  }

  private async validateRelations(
    data: {
      appId: string;
      categoryId?: string | null;
      lessonId?: string | null;
    },
  ) {
    const app = await this.prisma.app.findUnique({
      where: {
        id: data.appId,
      },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    if (data.categoryId) {
      const category =
        await this.prisma.vocabularyCategory.findUnique({
          where: {
            id: data.categoryId,
          },
        });

      if (!category) {
        throw new NotFoundException(
          'Vocabulary category not found',
        );
      }

      if (category.appId !== data.appId) {
        throw new BadRequestException(
          'Category does not belong to the selected app',
        );
      }
    }

    if (data.lessonId) {
      const lesson =
        await this.prisma.lesson.findUnique({
          where: {
            id: data.lessonId,
          },

          include: {
            module: {
              include: {
                course: true,
              },
            },
          },
        });

      if (!lesson) {
        throw new NotFoundException(
          'Lesson not found',
        );
      }

      if (
        lesson.module.course.appId !== data.appId
      ) {
        throw new BadRequestException(
          'Lesson does not belong to the selected app',
        );
      }
    }
  }
}