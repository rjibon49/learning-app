import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CreateVocabularyInput,
  UpdateVocabularyInput,
} from './vocabulary.schemas.js';

@Injectable()
export class VocabularyService {
  constructor(private readonly prisma: PrismaService) {}

  // ====================
  // CATEGORIES
  // ====================

  async createCategory(data: CreateCategoryInput) {
    const app = await this.prisma.app.findUnique({ where: { id: data.appId } });
    if (!app) throw new NotFoundException('App not found');
    return this.prisma.vocabularyCategory.create({ data });
  }

  findCategories(appId?: string) {
    return this.prisma.vocabularyCategory.findMany({
      where: {
        isActive: true,
        ...(appId ? { appId } : {}),
      },
      include: {
        _count: { select: { vocabulary: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async updateCategory(id: string, data: UpdateCategoryInput) {
    return this.prisma.vocabularyCategory.update({
      where: { id },
      data,
    });
  }

  async deleteCategory(id: string) {
    await this.prisma.vocabularyCategory.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ====================
  // VOCABULARY
  // ====================

  async createVocabulary(data: CreateVocabularyInput) {
    await this.validateRelations(data);
    return this.prisma.vocabulary.create({
      data: {
        ...data,
        status: data.isPublished ? 'PUBLISHED' : 'DRAFT',
      },
      include: {
        app: { select: { id: true, level: true, name: true, slug: true } },
        category: true,
        lesson: { select: { id: true, title: true, slug: true } },
        imageAsset: true,
        audioAsset: true,
      },
    });
  }

  findPublic(options: { appId?: string; categoryId?: string }) {
    return this.prisma.vocabulary.findMany({
      where: {
        isPublished: true,
        status: 'PUBLISHED',
        ...(options.appId ? { appId: options.appId } : {}),
        ...(options.categoryId ? { categoryId: options.categoryId } : {}),
      },
      include: {
        app: { select: { id: true, level: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        imageAsset: true,
        audioAsset: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  findAdmin(options: {
    appId?: string;
    categoryId?: string;
    published?: boolean;
  }) {
    return this.prisma.vocabulary.findMany({
      where: {
        ...(options.appId ? { appId: options.appId } : {}),
        ...(options.categoryId ? { categoryId: options.categoryId } : {}),
        ...(typeof options.published === 'boolean'
          ? { isPublished: options.published }
          : {}),
      },
      include: {
        app: { select: { id: true, level: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        imageAsset: true,
        audioAsset: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findPublicOne(id: string) {
    const vocabulary = await this.prisma.vocabulary.findFirst({
      where: {
        id,
        isPublished: true,
        status: 'PUBLISHED',
      },
      include: { app: true, category: true, lesson: true, imageAsset: true, audioAsset: true },
    });

    if (!vocabulary) throw new NotFoundException('Vocabulary item not found');
    return vocabulary;
  }

  async findOneForAdmin(id: string) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id },
      include: { app: true, category: true, lesson: true, imageAsset: true, audioAsset: true },
    });

    if (!vocabulary) throw new NotFoundException('Vocabulary item not found');
    return vocabulary;
  }

  async updateVocabulary(id: string, data: UpdateVocabularyInput) {
    const current = await this.findOneForAdmin(id);

    if (data.appId || data.categoryId || data.lessonId) {
      await this.validateRelations({
        appId: data.appId ?? current.appId,
        categoryId: data.categoryId === undefined ? current.categoryId : data.categoryId,
        lessonId: data.lessonId === undefined ? current.lessonId : data.lessonId,
      });
    }

    return this.prisma.vocabulary.update({
      where: { id },
      data: {
        ...data,
        ...(typeof data.isPublished === 'boolean'
          ? { status: data.isPublished ? 'PUBLISHED' : 'DRAFT' }
          : {}),
      },
      include: {
        imageAsset: true,
        audioAsset: true,
      }
    });
  }

  async deleteVocabulary(id: string) {
    await this.findOneForAdmin(id);
    await this.prisma.vocabulary.delete({ where: { id } });
    return { deleted: true, id };
  }

  private async validateRelations(data: {
    appId: string;
    categoryId?: string | null;
    lessonId?: string | null;
  }) {
    const app = await this.prisma.app.findUnique({ where: { id: data.appId } });
    if (!app) throw new NotFoundException('App not found');

    if (data.categoryId) {
      const category = await this.prisma.vocabularyCategory.findUnique({
        where: { id: data.categoryId },
      });
      if (!category) throw new NotFoundException('Vocabulary category not found');
      if (category.appId !== data.appId) {
        throw new BadRequestException(
          'Category does not belong to the selected app',
        );
      }
    }

    if (data.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: data.lessonId },
        include: { module: { include: { course: true } } },
      });
      if (!lesson) throw new NotFoundException('Lesson not found');
      if (lesson.module.course.appId !== data.appId) {
        throw new BadRequestException('Lesson does not belong to the selected app');
      }
    }
  }
}