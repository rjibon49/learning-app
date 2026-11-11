
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  Prisma,
} from '../generated/prisma/client.js';

import type {
  CreateDeckDto,
  UpdateDeckDto,
  AddDeckItemsDto,
  DeckListQueryDto,
  PaginationDto,
} from './dto/flashcard.dto.js';

@Injectable()
export class FlashcardsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // COMMON HELPERS
  // ==========================================

  private async deckOrThrow(id: string) {
    const deck = await this.prisma.flashcardDeck.findUnique({
      where: { id },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            languageId: true,
            isActive: true,
            language: {
              select: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException(
        'Flashcard deck not found',
      );
    }

    return deck;
  }

  private async publicDeckOrThrow(id: string) {
    const deck =
      await this.prisma.flashcardDeck.findFirst({
        where: {
          id,
          isPublished: true,
          app: {
            isActive: true,
            language: {
              isActive: true,
            },
          },
        },
        select: {
          id: true,
          appId: true,
          title: true,
          description: true,
          difficulty: true,
          sortOrder: true,
          app: {
            select: {
              id: true,
              name: true,
              slug: true,
              language: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    if (!deck) {
      throw new NotFoundException(
        'Published deck not found',
      );
    }

    return deck;
  }

  private async validateApp(appId: string) {
    const app = await this.prisma.app.findUnique({
      where: { id: appId },
      select: {
        id: true,
        languageId: true,
        isActive: true,
        language: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (
      !app ||
      !app.isActive ||
      !app.language.isActive
    ) {
      throw new BadRequestException(
        'App does not exist or is inactive',
      );
    }

    return app;
  }

  // ==========================================
  // PUBLIC: LIST DECKS
  // ==========================================

  async findPublicDecks(query: DeckListQueryDto) {
    const where: Prisma.FlashcardDeckWhereInput = {
      isPublished: true,

      app: {
        isActive: true,
        language: {
          isActive: true,
          ...(query.language
            ? { code: query.language }
            : {}),
        },
      },

      ...(query.appId
        ? { appId: query.appId }
        : {}),

      ...(query.difficulty
        ? { difficulty: query.difficulty }
        : {}),

      ...(query.search
        ? {
            title: {
              contains: query.search,
            },
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.flashcardDeck.findMany({
          where,
          select: {
            id: true,
            appId: true,
            title: true,
            description: true,
            difficulty: true,
            sortOrder: true,
            app: {
              select: {
                name: true,
                slug: true,
                language: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                level: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
            _count: {
              select: {
                items: {
                  where: {
                    vocabulary: {
                      status: 'PUBLISHED',
                      isPublished: true,
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),

        this.prisma.flashcardDeck.count({
          where,
        }),
      ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(
          total / query.limit,
        ),
      },
    };
  }

  // ==========================================
  // PUBLIC: DECK DETAILS
  // ==========================================

  async findPublicDeck(id: string) {
    const deck = await this.publicDeckOrThrow(id);

    const count =
      await this.prisma.flashcardDeckItem.count({
        where: {
          deckId: id,
          vocabulary: {
            status: 'PUBLISHED',
            isPublished: true,
            languageId: deck.app.language.id,
          },
        },
      });

    return {
      ...deck,
      totalCards: count,
    };
  }

  // ==========================================
  // PUBLIC: SAFE DECK CARDS
  // ==========================================

  async findPublicCards(
    deckId: string,
    pagination: PaginationDto,
  ) {
    const deck = await this.publicDeckOrThrow(deckId);

    const where: Prisma.FlashcardDeckItemWhereInput = {
      deckId,
      vocabulary: {
        status: 'PUBLISHED',
        isPublished: true,
        languageId: deck.app.language.id,
        language: {
          isActive: true,
        },
      },
    };

    const [items, total] =
      await this.prisma.$transaction([
        this.prisma.flashcardDeckItem.findMany({
          where,
          select: {
            id: true,
            sortOrder: true,

            vocabulary: {
              select: {
                id: true,
                term: true,
                pronunciation: true,
                partOfSpeech: true,
                grammar: true,
                difficulty: true,

                language: {
                  select: {
                    code: true,
                    name: true,
                  },
                },

                translations: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                  select: {
                    id: true,
                    meaning: true,
                    sortOrder: true,
                    language: {
                      select: {
                        code: true,
                        name: true,
                      },
                    },
                  },
                },

                examples: {
                  orderBy: {
                    sortOrder: 'asc',
                  },
                  select: {
                    id: true,
                    text: true,
                    sortOrder: true,
                    translationGroupId: true,
                    language: {
                      select: {
                        code: true,
                      },
                    },
                  },
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
              },
            },
          },

          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],

          skip:
            (pagination.page - 1) *
            pagination.limit,

          take: pagination.limit,
        }),

        this.prisma.flashcardDeckItem.count({
          where,
        }),
      ]);

    const data = items.map((item) => {
      const vocabulary = item.vocabulary;

      const imageAsset =
        vocabulary.imageAsset?.visibility === 'PUBLIC' &&
        vocabulary.imageAsset.status === 'READY'
          ? {
              id: vocabulary.imageAsset.id,
              publicUrl:
                vocabulary.imageAsset.publicUrl,
            }
          : null;

      const audioAsset =
        vocabulary.audioAsset?.visibility === 'PUBLIC' &&
        vocabulary.audioAsset.status === 'READY'
          ? {
              id: vocabulary.audioAsset.id,
              publicUrl:
                vocabulary.audioAsset.publicUrl,
            }
          : null;

      return {
        id: item.id,
        sortOrder: item.sortOrder,

        vocabulary: {
          id: vocabulary.id,
          term: vocabulary.term,
          pronunciation: vocabulary.pronunciation,
          partOfSpeech: vocabulary.partOfSpeech,
          grammar: vocabulary.grammar,
          difficulty: vocabulary.difficulty,
          language: vocabulary.language,
          translations: vocabulary.translations,
          examples: vocabulary.examples,
          imageAsset,
          audioAsset,
        },
      };
    });

    return {
      deckId,
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(
          total / pagination.limit,
        ),
      },
    };
  }

  // ==========================================
  // ADMIN: LIST DECKS
  // ==========================================

  async findAdminDecks(query: DeckListQueryDto) {
    const where: Prisma.FlashcardDeckWhereInput = {
      ...(query.appId
        ? { appId: query.appId }
        : {}),

      ...(query.language
        ? {
            app: {
              language: {
                code: query.language,
              },
            },
          }
        : {}),

      ...(query.difficulty
        ? { difficulty: query.difficulty }
        : {}),

      ...(query.search
        ? {
            title: {
              contains: query.search,
            },
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.flashcardDeck.findMany({
          where,

          include: {
            app: {
              select: {
                id: true,
                name: true,
                slug: true,
                isActive: true,
                language: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                level: {
                  select: {
                    code: true,
                  },
                },
              },
            },

            _count: {
              select: {
                items: true,
              },
            },
          },

          orderBy: [
            { createdAt: 'desc' },
          ],

          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),

        this.prisma.flashcardDeck.count({
          where,
        }),
      ]);

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(
          total / query.limit,
        ),
      },
    };
  }

  // ==========================================
  // ADMIN: DECK DETAILS
  // ==========================================

  async findAdminDeck(id: string) {
    await this.deckOrThrow(id);

    return this.prisma.flashcardDeck.findUniqueOrThrow({
      where: { id },
      include: {
        app: {
          include: {
            language: true,
            level: true,
          },
        },

        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }

  // ==========================================
  // ADMIN: CREATE DECK
  // ==========================================

  async createDeck(input: CreateDeckDto) {
    await this.validateApp(input.appId);

    if (input.isPublished) {
      throw new BadRequestException(
        'Create the deck as draft before publishing',
      );
    }

    return this.prisma.flashcardDeck.create({
      data: {
        appId: input.appId,
        title: input.title,
        description: input.description ?? null,
        difficulty: input.difficulty,
        isPublished: false,
        sortOrder: input.sortOrder,
      },
    });
  }

  // ==========================================
  // ADMIN: UPDATE DECK
  // ==========================================

  async updateDeck(
    id: string,
    input: UpdateDeckDto,
  ) {
    const deck = await this.deckOrThrow(id);

    if (input.isPublished === true) {
      await this.validateApp(deck.appId);

      const validItems =
        await this.prisma.flashcardDeckItem.count({
          where: {
            deckId: id,
            vocabulary: {
              languageId: deck.app.languageId,
              status: 'PUBLISHED',
              isPublished: true,
            },
          },
        });

      if (validItems === 0) {
        throw new BadRequestException(
          'Add at least one published vocabulary before publishing a deck',
        );
      }
    }

    return this.prisma.flashcardDeck.update({
      where: { id },
      data: input,
    });
  }

  // ==========================================
  // ADMIN: UNPUBLISH DECK
  // ==========================================

  async unpublishDeck(id: string) {
    await this.deckOrThrow(id);

    return this.prisma.flashcardDeck.update({
      where: { id },
      data: {
        isPublished: false,
      },
    });
  }

  // ==========================================
  // ADMIN: DECK ITEMS
  // ==========================================

  async getDeckItems(
    deckId: string,
    pagination: PaginationDto,
  ) {
    await this.deckOrThrow(deckId);

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.flashcardDeckItem.findMany({
          where: { deckId },

          include: {
            vocabulary: {
              include: {
                language: {
                  select: {
                    code: true,
                    name: true,
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
              },
            },
          },

          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],

          skip:
            (pagination.page - 1) *
            pagination.limit,

          take: pagination.limit,
        }),

        this.prisma.flashcardDeckItem.count({
          where: { deckId },
        }),
      ]);

    return {
      data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(
          total / pagination.limit,
        ),
      },
    };
  }

  // ==========================================
  // ADMIN: ADD VOCABULARY TO DECK
  // ==========================================

  async addItemsToDeck(
    deckId: string,
    input: AddDeckItemsDto,
  ) {
    const deck = await this.deckOrThrow(deckId);

    if (deck.isPublished) {
      throw new ConflictException(
        'Unpublish the deck before editing its cards',
      );
    }

    const vocabulary =
      await this.prisma.vocabulary.findMany({
        where: {
          id: {
            in: input.vocabularyIds,
          },
        },
        select: {
          id: true,
          languageId: true,
        },
      });

    if (vocabulary.length !== input.vocabularyIds.length) {
      throw new BadRequestException(
        'One or more vocabulary records do not exist',
      );
    }

    const invalidLanguage = vocabulary.some(
      (item) =>
        item.languageId !== deck.app.languageId,
    );

    if (invalidLanguage) {
      throw new BadRequestException(
        'Vocabulary and deck languages must match',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.flashcardDeckItem.findMany({
        where: { deckId },
        select: {
          vocabularyId: true,
          sortOrder: true,
        },
      });

      const existingIds = new Set(
        existing.map((item) => item.vocabularyId),
      );

      const newIds = input.vocabularyIds.filter(
        (id) => !existingIds.has(id),
      );

      const maxSortOrder = existing.reduce(
        (maximum, item) =>
          Math.max(maximum, item.sortOrder),
        -1,
      );

      if (newIds.length > 0) {
        await tx.flashcardDeckItem.createMany({
          data: newIds.map((vocabularyId, index) => ({
            deckId,
            vocabularyId,
            sortOrder: maxSortOrder + index + 1,
          })),
          skipDuplicates: true,
        });
      }
    });

    return {
      success: true,
      message: 'Deck items updated',
    };
  }

  // ==========================================
  // ADMIN: REMOVE DECK ITEM
  // ==========================================

  async removeItemFromDeck(
    deckId: string,
    itemId: string,
  ) {
    const deck = await this.deckOrThrow(deckId);

    if (deck.isPublished) {
      throw new ConflictException(
        'Unpublish the deck before removing cards',
      );
    }

    const result =
      await this.prisma.flashcardDeckItem.deleteMany({
        where: {
          id: itemId,
          deckId,
        },
      });

    if (!result.count) {
      throw new NotFoundException(
        'Deck item not found',
      );
    }

    return { success: true };
  }

  // ==========================================
  // ADMIN: USER PROGRESS REPORTING
  // ==========================================

  async getUserProgress(
    userId: string,
    pagination: PaginationDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        isActive: true,
        currentStreak: true,
        longestStreak: true,
      },
    });

    if (!user) {
      throw new NotFoundException(
        'Learner not found',
      );
    }

    const now = new Date();

    const [
      vocabularyProgress,
      totalVocabulary,
      dueCount,
      masteredCount,
      completedLessons,
    ] = await this.prisma.$transaction([
      this.prisma.vocabularyProgress.findMany({
        where: { userId },

        select: {
          id: true,
          correctCount: true,
          wrongCount: true,
          masteryScore: true,
          masteryLevel: true,
          easeFactor: true,
          intervalDays: true,
          repetitionCount: true,
          nextReviewAt: true,
          lastReviewedAt: true,

          vocabulary: {
            select: {
              id: true,
              term: true,
              language: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
        },

        orderBy: [
          { lastReviewedAt: 'desc' },
          { id: 'asc' },
        ],

        skip:
          (pagination.page - 1) *
          pagination.limit,

        take: pagination.limit,
      }),

      this.prisma.vocabularyProgress.count({
        where: { userId },
      }),

      this.prisma.vocabularyProgress.count({
        where: {
          userId,
          nextReviewAt: { lte: now },
        },
      }),

      this.prisma.vocabularyProgress.count({
        where: {
          userId,
          masteryLevel: 'MASTERED',
        },
      }),

      this.prisma.lessonProgress.count({
        where: {
          userId,
          completedAt: { not: null },
        },
      }),
    ]);

    return {
      user,
      summary: {
        totalVocabulary,
        dueCount,
        masteredCount,
        completedLessons,
      },
      vocabularyProgress,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: totalVocabulary,
        totalPages: Math.ceil(
          totalVocabulary / pagination.limit,
        ),
      },
    };
  }
}
