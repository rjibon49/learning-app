
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import {
  Prisma,
  type MediaType,
} from '../generated/prisma/client.js';

import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryTranslationInput,
  CreateVocabularyInput,
  UpdateVocabularyInput,
  VocabularyTranslationInput,
  VocabularyExampleInput,
  UpdateVocabularyExampleInput,
  VocabularyListQuery,
} from './vocabulary.schemas.js';

@Injectable()
export class VocabularyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private handleUnique(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'A record with this unique value already exists',
      );
    }
    throw error;
  }

  private async languageOrThrow(id: string) {
    const language = await this.prisma.language.findUnique({
      where: { id },
    });

    if (!language || !language.isActive) {
      throw new BadRequestException(
        'Language does not exist or is inactive',
      );
    }
    return language;
  }

  private async categoryOrThrow(id: string) {
    const category =
      await this.prisma.vocabularyCategory.findUnique({
        where: { id },
      });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async vocabularyOrThrow(id: string) {
    const vocabulary = await this.prisma.vocabulary.findUnique({
      where: { id },
    });

    if (!vocabulary) {
      throw new NotFoundException('Vocabulary not found');
    }

    return vocabulary;
  }

  private async validateAsset(
    assetId: string | null | undefined,
    requiredType: MediaType,
  ): Promise<void> {
    if (!assetId) return;

    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: {
        type: true,
        status: true,
      },
    });

    if (
      !asset ||
      asset.type !== requiredType ||
      asset.status !== 'READY'
    ) {
      throw new BadRequestException(
        `A READY ${requiredType} media asset is required`,
      );
    }
  }

  private async validateRelations(data: {
    languageId: string;
    categoryId?: string | null;
    lessonId?: string | null;
    imageAssetId?: string | null;
    audioAssetId?: string | null;
  }): Promise<void> {
    await this.languageOrThrow(data.languageId);

    if (data.categoryId) {
      await this.categoryOrThrow(data.categoryId);
    }

    if (data.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: data.lessonId },
        select: {
          module: {
            select: {
              course: {
                select: { languageId: true },
              },
            },
          },
        },
      });

      if (!lesson) {
        throw new NotFoundException('Lesson not found');
      }

      if (
        lesson.module.course.languageId !==
        data.languageId
      ) {
        throw new BadRequestException(
          'Vocabulary and lesson languages must match',
        );
      }
    }

    await this.validateAsset(
      data.imageAssetId,
      'IMAGE',
    );

    await this.validateAsset(
      data.audioAssetId,
      'AUDIO',
    );
  }

  // ========================================
  // CATEGORY MANAGEMENT
  // ========================================

  async createCategory(data: CreateCategoryInput) {
    try {
      return await this.prisma.vocabularyCategory.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        },
      });
    } catch (error) {
      this.handleUnique(error);
    }
  }

  findCategories(admin = false) {
    return this.prisma.vocabularyCategory.findMany({
      where: admin ? undefined : { isActive: true },
      include: {
        translations: {
          select: {
            languageId: true,
            name: true,
            description: true,
            language: {
              select: {
                code: true,
              },
            },
          },
        },
        _count: {
          select: { vocabulary: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryInput,
  ) {
    await this.categoryOrThrow(id);

    try {
      return await this.prisma.vocabularyCategory.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handleUnique(error);
    }
  }

  async deleteCategory(id: string) {
    await this.categoryOrThrow(id);

    // Soft deletion preserves category assignments.
    return this.prisma.vocabularyCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async saveCategoryTranslation(
    categoryId: string,
    data: CategoryTranslationInput,
  ) {
    await this.categoryOrThrow(categoryId);
    await this.languageOrThrow(data.languageId);

    return this.prisma.vocabularyCategoryTranslation.upsert({
      where: {
        categoryId_languageId: {
          categoryId,
          languageId: data.languageId,
        },
      },
      create: {
        categoryId,
        languageId: data.languageId,
        name: data.name,
        description: data.description ?? null,
      },
      update: {
        name: data.name,
        description: data.description ?? null,
      },
    });
  }

  async removeCategoryTranslation(
    categoryId: string,
    languageId: string,
  ) {
    const result =
      await this.prisma.vocabularyCategoryTranslation.deleteMany({
        where: { categoryId, languageId },
      });

    if (!result.count) {
      throw new NotFoundException(
        'Category translation not found',
      );
    }

    return { success: true };
  }

  // ========================================
  // LISTING & FILTERING
  // ========================================

  private async buildWhere(
    query: VocabularyListQuery,
    admin: boolean,
  ): Promise<Prisma.VocabularyWhereInput> {
    const where: Prisma.VocabularyWhereInput = admin
      ? {}
      : {
          status: 'PUBLISHED',
          isPublished: true,
          language: { isActive: true },
        };

    if (query.language) {
      where.language = {
        code: query.language,
        ...(!admin ? { isActive: true } : {}),
      };
    }

    if (query.languageId) {
      where.languageId = query.languageId;
    }

    if (query.appId) {
      const app = await this.prisma.app.findUnique({
        where: { id: query.appId },
        select: {
          languageId: true,
          isActive: true,
        },
      });

      if (!app || (!admin && !app.isActive)) {
        throw new NotFoundException('App not found');
      }

      if (
        query.languageId &&
        query.languageId !== app.languageId
      ) {
        throw new BadRequestException(
          'App and language filters conflict',
        );
      }

      where.languageId = app.languageId;
    }

    if (query.lessonId) {
      where.lessonId = query.lessonId;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.difficulty) {
      where.difficulty = query.difficulty;
    }

    if (admin && query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.term = {
        contains: query.search,
      };
    }

    return where;
  }

  private readonly publicInclude = {
    language: {
      select: {
        code: true,
        name: true,
        nativeName: true,
      },
    },
    category: {
      select: {
        id: true,
        name: true,
        slug: true,
      },
    },
    translations: {
      select: {
        id: true,
        meaning: true,
        notes: true,
        sortOrder: true,
        language: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    },
    examples: {
      select: {
        id: true,
        text: true,
        sortOrder: true,
        translationGroupId: true,
        language: {
          select: { code: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    },
    imageAsset: {
      select: {
        id: true,
        visibility: true,
        status: true,
        publicUrl: true,
      },
    },
    audioAsset: {
      select: {
        id: true,
        visibility: true,
        status: true,
        publicUrl: true,
      },
    },
  } as const;

  private sanitizePublicMedia<T extends {
    imageAsset: {
      visibility: string;
      status: string;
      publicUrl: string | null;
    } | null;
    audioAsset: {
      visibility: string;
      status: string;
      publicUrl: string | null;
    } | null;
  }>(item: T) {
    return {
      ...item,
      imageAsset:
        item.imageAsset?.visibility === 'PUBLIC' &&
        item.imageAsset.status === 'READY'
          ? item.imageAsset
          : null,
      audioAsset:
        item.audioAsset?.visibility === 'PUBLIC' &&
        item.audioAsset.status === 'READY'
          ? item.audioAsset
          : null,
    };
  }

  async findPublic(query: VocabularyListQuery) {
    const where = await this.buildWhere(query, false);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where,
        include: this.publicInclude,
        orderBy: [
          { term: 'asc' },
          { id: 'asc' },
        ],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.vocabulary.count({ where }),
    ]);

    return {
      data: data.map((item) =>
        this.sanitizePublicMedia(item),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findAdmin(query: VocabularyListQuery) {
    const where = await this.buildWhere(query, true);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vocabulary.findMany({
        where,
        include: {
          language: true,
          category: true,
          lesson: {
            select: {
              id: true,
              title: true,
            },
          },
          translations: {
            include: {
              language: true,
            },
          },
          examples: {
            include: {
              language: true,
            },
          },
          imageAsset: {
            select: {
              id: true,
              type: true,
              status: true,
              visibility: true,
              publicUrl: true,
            },
          },
          audioAsset: {
            select: {
              id: true,
              type: true,
              status: true,
              visibility: true,
              publicUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.vocabulary.count({ where }),
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

  async findPublicOne(id: string) {
    const item = await this.prisma.vocabulary.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        isPublished: true,
        language: { isActive: true },
      },
      include: this.publicInclude,
    });

    if (!item) {
      throw new NotFoundException('Vocabulary not found');
    }

    return this.sanitizePublicMedia(item);
  }

  async findOneForAdmin(id: string) {
    const item = await this.prisma.vocabulary.findUnique({
      where: { id },
      include: {
        language: true,
        category: true,
        lesson: true,
        translations: {
          include: { language: true },
        },
        examples: {
          include: { language: true },
        },
        imageAsset: {
          select: {
            id: true,
            type: true,
            status: true,
            visibility: true,
            publicUrl: true,
          },
        },
        audioAsset: {
          select: {
            id: true,
            type: true,
            status: true,
            visibility: true,
            publicUrl: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Vocabulary not found');
    }

    return item;
  }

  // ========================================
  // CREATE / UPDATE / ARCHIVE
  // ========================================

  async createVocabulary(data: CreateVocabularyInput) {
    await this.validateRelations(data);

    return this.prisma.vocabulary.create({
      data: {
        languageId: data.languageId,
        lessonId: data.lessonId ?? null,
        categoryId: data.categoryId ?? null,
        term: data.term,
        pronunciation: data.pronunciation ?? null,
        partOfSpeech: data.partOfSpeech ?? null,
        grammar: data.grammar ?? undefined,
        difficulty: data.difficulty,
        status: data.status,
        isPublished: data.status === 'PUBLISHED',
        notes: data.notes ?? null,
        imageAssetId: data.imageAssetId ?? null,
        audioAssetId: data.audioAssetId ?? null,
      },
    });
  }

  
async updateVocabulary(
  id: string,
  input: UpdateVocabularyInput,
) {
  // ==========================================
  // 1. Check existing vocabulary
  // ==========================================
  const existing = await this.vocabularyOrThrow(id);

  // ==========================================
  // 2. Validate relationships
  // ==========================================
  await this.validateRelations({
    languageId: existing.languageId,

    lessonId:
      input.lessonId === undefined
        ? existing.lessonId
        : input.lessonId,

    categoryId:
      input.categoryId === undefined
        ? existing.categoryId
        : input.categoryId,

    imageAssetId:
      input.imageAssetId === undefined
        ? existing.imageAssetId
        : input.imageAssetId,

    audioAssetId:
      input.audioAssetId === undefined
        ? existing.audioAssetId
        : input.audioAssetId,
  });

  // ==========================================
  // 3. Build type-safe Prisma update
  // ==========================================
  const updateData: Prisma.VocabularyUncheckedUpdateInput = {};

  if (input.term !== undefined) {
    updateData.term = input.term;
  }

  if (input.pronunciation !== undefined) {
    updateData.pronunciation = input.pronunciation;
  }

  if (input.partOfSpeech !== undefined) {
    updateData.partOfSpeech = input.partOfSpeech;
  }

  if (input.lessonId !== undefined) {
    updateData.lessonId = input.lessonId;
  }

  if (input.categoryId !== undefined) {
    updateData.categoryId = input.categoryId;
  }

  if (input.imageAssetId !== undefined) {
    updateData.imageAssetId = input.imageAssetId;
  }

  if (input.audioAssetId !== undefined) {
    updateData.audioAssetId = input.audioAssetId;
  }

  if (input.difficulty !== undefined) {
    updateData.difficulty = input.difficulty;
  }

  if (input.notes !== undefined) {
    updateData.notes = input.notes;
  }

  // ==========================================
  // 4. Handle nullable Prisma JSON field
  // ==========================================
  if (input.grammar !== undefined) {
    updateData.grammar =
      input.grammar === null
        ? Prisma.DbNull
        : input.grammar;
  }

  // ==========================================
  // 5. Publication status
  // ==========================================
  if (input.status !== undefined) {
    updateData.status = input.status;

    updateData.isPublished =
      input.status === 'PUBLISHED';
  }

  // ==========================================
  // 6. Update record
  // ==========================================
  return this.prisma.vocabulary.update({
    where: {
      id,
    },

    data: updateData,

    include: {
      language: {
        select: {
          id: true,
          code: true,
          name: true,
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

      translations: {
        include: {
          language: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },

      examples: {
        include: {
          language: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  });
}


  async deleteVocabulary(id: string) {
    await this.vocabularyOrThrow(id);

    // Archive rather than cascade-delete
    // flashcard and learner progress records.
    return this.prisma.vocabulary.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isPublished: false,
      },
    });
  }

  // ========================================
  // TRANSLATIONS
  // ========================================

  async addTranslation(
    vocabularyId: string,
    data: VocabularyTranslationInput,
  ) {
    await this.vocabularyOrThrow(vocabularyId);
    await this.languageOrThrow(data.languageId);

    return this.prisma.vocabularyTranslation.create({
      data: {
        vocabularyId,
        languageId: data.languageId,
        meaning: data.meaning,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder,
      },
    });
  }

  async updateTranslation(
    vocabularyId: string,
    translationId: string,
    data: VocabularyTranslationInput,
  ) {
    const existing =
      await this.prisma.vocabularyTranslation.findFirst({
        where: {
          id: translationId,
          vocabularyId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Translation not found',
      );
    }

    await this.languageOrThrow(data.languageId);

    return this.prisma.vocabularyTranslation.update({
      where: { id: existing.id },
      data: {
        languageId: data.languageId,
        meaning: data.meaning,
        notes: data.notes ?? null,
        sortOrder: data.sortOrder,
      },
    });
  }

  async removeTranslation(
    vocabularyId: string,
    translationId: string,
  ) {
    const result =
      await this.prisma.vocabularyTranslation.deleteMany({
        where: {
          id: translationId,
          vocabularyId,
        },
      });

    if (!result.count) {
      throw new NotFoundException(
        'Translation not found',
      );
    }

    return { success: true };
  }

  // ========================================
  // EXAMPLE SENTENCES
  // ========================================

  async addExample(
    vocabularyId: string,
    data: VocabularyExampleInput,
  ) {
    await this.vocabularyOrThrow(vocabularyId);
    await this.languageOrThrow(data.languageId);

    return this.prisma.vocabularyExample.create({
      data: {
        vocabularyId,
        languageId: data.languageId,
        text: data.text,
        translationGroupId:
          data.translationGroupId ?? null,
        sortOrder: data.sortOrder,
      },
    });
  }

  async updateExample(
    vocabularyId: string,
    exampleId: string,
    data: UpdateVocabularyExampleInput,
  ) {
    const example =
      await this.prisma.vocabularyExample.findFirst({
        where: {
          id: exampleId,
          vocabularyId,
        },
      });

    if (!example) {
      throw new NotFoundException('Example not found');
    }

    if (data.languageId) {
      await this.languageOrThrow(data.languageId);
    }

    return this.prisma.vocabularyExample.update({
      where: { id: exampleId },
      data,
    });
  }

  async removeExample(
    vocabularyId: string,
    exampleId: string,
  ) {
    const result =
      await this.prisma.vocabularyExample.deleteMany({
        where: {
          id: exampleId,
          vocabularyId,
        },
      });

    if (!result.count) {
      throw new NotFoundException('Example not found');
    }

    return { success: true };
  }
}
