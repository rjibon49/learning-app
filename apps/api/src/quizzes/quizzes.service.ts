
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type { Prisma } from '../generated/prisma/client.js';

import type {
  CreateQuizDto,
  UpdateQuizDto,
  CreateQuestionDto,
  UpdateQuestionDto,
  QuizListQueryDto,
} from './dto/quiz.dto.js';

@Injectable()
export class QuizzesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async quizOrThrow(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  private async questionOrThrow(id: string) {
    const question =
      await this.prisma.quizQuestion.findUnique({
        where: { id },
      });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  private async assertDraft(quizId: string) {
    const quiz = await this.quizOrThrow(quizId);

    if (quiz.status === 'PUBLISHED') {
      throw new ConflictException(
        'Unpublish the quiz before editing questions',
      );
    }

    if (quiz.status === 'ARCHIVED') {
      throw new ConflictException(
        'Archived quizzes cannot be modified',
      );
    }

    return quiz;
  }

  private async validateScope(
    appId: string | null | undefined,
    lessonId: string | null | undefined,
  ) {
    if (!appId && !lessonId) {
      throw new BadRequestException(
        'An appId or lessonId is required',
      );
    }

    const app = appId
      ? await this.prisma.app.findUnique({
          where: { id: appId },
          select: {
            id: true,
            languageId: true,
            levelId: true,
            isActive: true,
          },
        })
      : null;

    if (appId && (!app || !app.isActive)) {
      throw new BadRequestException(
        'Invalid or inactive app',
      );
    }

    const lesson = lessonId
      ? await this.prisma.lesson.findUnique({
          where: { id: lessonId },
          select: {
            module: {
              select: {
                course: {
                  select: {
                    id: true,
                    languageId: true,
                    levelId: true,
                  },
                },
              },
            },
          },
        })
      : null;

    if (lessonId && !lesson) {
      throw new BadRequestException(
        'Lesson does not exist',
      );
    }

    if (app && lesson) {
      const course = lesson.module.course;

      if (app.languageId !== course.languageId) {
        throw new BadRequestException(
          'App and lesson languages do not match',
        );
      }

      if (
        app.levelId &&
        course.levelId &&
        app.levelId !== course.levelId
      ) {
        throw new BadRequestException(
          'App and course levels do not match',
        );
      }

      const link = await this.prisma.courseApp.findUnique({
        where: {
          courseId_appId: {
            courseId: course.id,
            appId: app.id,
          },
        },
      });

      if (!link) {
        throw new BadRequestException(
          'The course is not assigned to this app',
        );
      }
    }
  }

  private async validateVocabulary(
    quizId: string,
    vocabularyId?: string | null,
  ) {
    if (!vocabularyId) return;

    const quiz = await this.quizOrThrow(quizId);

    const vocabulary =
      await this.prisma.vocabulary.findUnique({
        where: { id: vocabularyId },
        select: { languageId: true },
      });

    if (!vocabulary) {
      throw new BadRequestException(
        'Vocabulary does not exist',
      );
    }

    let expectedLanguageId: string | undefined;

    if (quiz.appId) {
      const app = await this.prisma.app.findUnique({
        where: { id: quiz.appId },
        select: { languageId: true },
      });

      expectedLanguageId = app?.languageId;
    }

    if (!expectedLanguageId && quiz.lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: quiz.lessonId },
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

      expectedLanguageId =
        lesson?.module.course.languageId;
    }

    if (
      !expectedLanguageId ||
      expectedLanguageId !== vocabulary.languageId
    ) {
      throw new BadRequestException(
        'Vocabulary language does not match quiz',
      );
    }
  }

  private validateOptions(
    type: string,
    options?: Array<{
      text: string;
      isCorrect: boolean;
      sortOrder: number;
    }>,
  ) {
    if (!options) return;

    if (type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE') {
      if (options.length < 2) {
        throw new BadRequestException(
          'At least two options are required',
        );
      }

      const correctCount = options.filter(
        (option) => option.isCorrect,
      ).length;

      if (correctCount !== 1) {
        throw new BadRequestException(
          'Exactly one option must be correct',
        );
      }
    }

    const orders = options.map(
      (option) => option.sortOrder,
    );

    if (new Set(orders).size !== orders.length) {
      throw new BadRequestException(
        'Option sortOrder values must be unique',
      );
    }
  }

  private async validatePublishing(quizId: string) {
    const questions =
      await this.prisma.quizQuestion.findMany({
        where: { quizId },
        include: {
          options: true,
        },
      });

    if (questions.length === 0) {
      throw new BadRequestException(
        'Add at least one question before publishing',
      );
    }

    for (const question of questions) {
      if (
        question.questionType === 'MULTIPLE_CHOICE' ||
        question.questionType === 'TRUE_FALSE'
      ) {
        this.validateOptions(
          question.questionType,
          question.options,
        );
      } else if (!question.correctAnswer?.trim()) {
        throw new BadRequestException(
          'Every non-choice question needs a correct answer',
        );
      }

      if (
        ['IMAGE_TO_TARGET'].includes(question.questionType) &&
        !question.imageUrl
      ) {
        throw new BadRequestException(
          'Image questions need an image URL',
        );
      }

      if (
        ['AUDIO_TO_TARGET', 'LISTEN_AND_TYPE'].includes(
          question.questionType,
        ) &&
        !question.audioUrl
      ) {
        throw new BadRequestException(
          'Audio questions need an audio URL',
        );
      }
    }
  }

  private readonly publicWhere = {
    status: 'PUBLISHED' as const,
    isPublished: true,
    OR: [
      { appId: null },
      { app: { isActive: true } },
    ],
  };

  // =========================================
  // PUBLIC: SAFE QUIZ LIST
  // =========================================

  async findPublic(query: QuizListQueryDto) {
    const where: Prisma.QuizWhereInput = {
      ...this.publicWhere,

      ...(query.appId ? { appId: query.appId } : {}),
      ...(query.lessonId
        ? { lessonId: query.lessonId }
        : {}),

      ...(query.difficulty
        ? { difficulty: query.difficulty }
        : {}),

      ...(query.search
        ? {
            title: { contains: query.search },
          }
        : {}),

      lesson: {
        is: {
          OR: [
            { id: { not: '' } },
          ],
          status: 'PUBLISHED',
          module: {
            status: 'PUBLISHED',
            course: {
              status: 'PUBLISHED',
              language: { isActive: true },
            },
          },
        },
      },
    };

    // Standalone quizzes without lessons are allowed.
    delete where.lesson;

    where.AND = [
      {
        OR: [
          { lessonId: null },
          {
            lesson: {
              is: {
                status: 'PUBLISHED',
                module: {
                  status: 'PUBLISHED',
                  course: {
                    status: 'PUBLISHED',
                    language: { isActive: true },
                  },
                },
              },
            },
          },
        ],
      },
    ];

    const [items, total] =
      await this.prisma.$transaction([
        this.prisma.quiz.findMany({
          where,
          select: {
            id: true,
            appId: true,
            lessonId: true,
            title: true,
            description: true,
            difficulty: true,
            timeLimitSeconds: true,
            passingScore: true,
            _count: {
              select: { questions: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.quiz.count({ where }),
      ]);

    return {
      data: items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findPublicOne(id: string) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id,
        ...this.publicWhere,
        AND: [{
          OR: [
            { lessonId: null },
            {
              lesson: {
                is: {
                  status: 'PUBLISHED',
                  module: {
                    status: 'PUBLISHED',
                    course: {
                      status: 'PUBLISHED',
                      language: { isActive: true },
                    },
                  },
                },
              },
            },
          ],
        }],
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        timeLimitSeconds: true,
        passingScore: true,
        questions: {
          orderBy: [
            { sortOrder: 'asc' },
            { id: 'asc' },
          ],
          select: {
            id: true,
            questionType: true,
            questionText: true,
            imageUrl: true,
            audioUrl: true,
            points: true,
            sortOrder: true,
            options: {
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                id: true,
                text: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(
        'Published quiz not found',
      );
    }

    return quiz;
  }

  // =========================================
  // ADMIN: QUIZZES
  // =========================================

  async findAllQuizzes(query: QuizListQueryDto) {
    const where: Prisma.QuizWhereInput = {
      ...(query.appId ? { appId: query.appId } : {}),
      ...(query.lessonId
        ? { lessonId: query.lessonId }
        : {}),
      ...(query.status
        ? { status: query.status }
        : {}),
      ...(query.difficulty
        ? { difficulty: query.difficulty }
        : {}),
      ...(query.search
        ? { title: { contains: query.search } }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.quiz.findMany({
          where,
          include: {
            app: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            lesson: {
              select: {
                id: true,
                title: true,
              },
            },
            _count: {
              select: {
                questions: true,
                attempts: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.quiz.count({ where }),
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

  async findOneAdmin(id: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    return quiz;
  }

  async createQuiz(input: CreateQuizDto) {
    await this.validateScope(
      input.appId,
      input.lessonId,
    );

    if (input.status === 'PUBLISHED') {
      throw new BadRequestException(
        'Create the quiz as DRAFT, add questions, then publish',
      );
    }

    return this.prisma.quiz.create({
      data: {
        appId: input.appId ?? null,
        lessonId: input.lessonId ?? null,
        title: input.title,
        description: input.description ?? null,
        difficulty: input.difficulty,
        status: input.status,
        isPublished: false,
        timeLimitSeconds:
          input.timeLimitSeconds ?? null,
        passingScore: input.passingScore ?? null,
      },
    });
  }

  async updateQuiz(
    id: string,
    input: UpdateQuizDto,
  ) {
    const existing = await this.quizOrThrow(id);

    if (existing.status === 'ARCHIVED') {
      throw new ConflictException(
        'Archived quizzes cannot be changed',
      );
    }

    const appId =
      input.appId === undefined
        ? existing.appId
        : input.appId;

    const lessonId =
      input.lessonId === undefined
        ? existing.lessonId
        : input.lessonId;

    await this.validateScope(appId, lessonId);

    if (
      existing.status === 'PUBLISHED' &&
      (
        input.appId !== undefined ||
        input.lessonId !== undefined
      )
    ) {
      throw new ConflictException(
        'Unpublish before changing quiz scope',
      );
    }

    if (input.status === 'PUBLISHED') {
      await this.validatePublishing(id);
    }

    const data: Prisma.QuizUncheckedUpdateInput = {
      ...input,
    };

    if (input.status !== undefined) {
      data.isPublished =
        input.status === 'PUBLISHED';
    }

    return this.prisma.quiz.update({
      where: { id },
      data,
    });
  }

  async archiveQuiz(id: string) {
    await this.quizOrThrow(id);

    return this.prisma.quiz.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        isPublished: false,
      },
    });
  }

  // =========================================
  // ADMIN: QUESTIONS & OPTIONS
  // =========================================

  async getQuizQuestions(quizId: string) {
    await this.quizOrThrow(quizId);

    return this.prisma.quizQuestion.findMany({
      where: { quizId },
      include: {
        options: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createQuestion(input: CreateQuestionDto) {
    await this.assertDraft(input.quizId);

    await this.validateVocabulary(
      input.quizId,
      input.vocabularyId,
    );

    this.validateOptions(
      input.questionType,
      input.options,
    );

    const { options, ...fields } = input;

    return this.prisma.quizQuestion.create({
      data: {
        quizId: fields.quizId,
        vocabularyId: fields.vocabularyId ?? null,
        questionType: fields.questionType,
        questionText: fields.questionText ?? null,
        imageUrl: fields.imageUrl ?? null,
        audioUrl: fields.audioUrl ?? null,
        correctAnswer: fields.correctAnswer ?? null,
        explanation: fields.explanation ?? null,
        points: fields.points,
        sortOrder: fields.sortOrder,
        ...(options
          ? { options: { create: options } }
          : {}),
      },
      include: {
        options: true,
      },
    });
  }

  async updateQuestion(
    id: string,
    input: UpdateQuestionDto,
  ) {
    const existing = await this.questionOrThrow(id);

    await this.assertDraft(existing.quizId);

    if (input.vocabularyId !== undefined) {
      await this.validateVocabulary(
        existing.quizId,
        input.vocabularyId,
      );
    }

    if (input.options !== undefined) {
      this.validateOptions(
        input.questionType ?? existing.questionType,
        input.options,
      );
    }

    const { options, ...fields } = input;

    return this.prisma.$transaction(async (tx) => {
      const question = await tx.quizQuestion.update({
        where: { id },
        data: fields,
      });

      if (options !== undefined) {
        await tx.quizOption.deleteMany({
          where: { questionId: id },
        });

        if (options.length) {
          await tx.quizOption.createMany({
            data: options.map((option) => ({
              questionId: id,
              ...option,
            })),
          });
        }
      }

      return tx.quizQuestion.findUniqueOrThrow({
        where: { id: question.id },
        include: {
          options: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  async deleteQuestion(id: string) {
    const existing = await this.questionOrThrow(id);

    await this.assertDraft(existing.quizId);

    // Prevent deleting questions that already
    // have learner answers.
    const answerCount = await this.prisma.quizAnswer.count({
      where: { questionId: id },
    });

    if (answerCount > 0) {
      throw new ConflictException(
        'Question has learner answers and cannot be deleted',
      );
    }

    await this.prisma.quizQuestion.delete({
      where: { id },
    });

    return { success: true };
  }
}
