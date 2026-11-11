
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  Prisma,
  MasteryLevel,
} from '../generated/prisma/client.js';

import type {
  ReviewVocabularyDto,
  UpdateLessonProgressDto,
  SubmitQuizDto,
  ProgressPaginationDto,
} from './dto/progress.dto.js';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =========================================
  // DATE HELPERS
  // =========================================

  private utcDay(date: Date): Date {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
      ),
    );
  }

  private addDays(date: Date, days: number): Date {
    return new Date(
      date.getTime() + days * 86400000,
    );
  }

  private normalizeAnswer(value: string): string {
    return value
      .normalize('NFC')
      .trim()
      .replace(/\s+/gu, ' ')
      .toLocaleLowerCase('und');
  }

  // =========================================
  // DAILY ACTIVITY + STREAK
  // Must run inside a transaction.
  // =========================================

  private async recordActivity(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
  ): Promise<void> {
    const today = this.utcDay(now);
    const yesterday = this.addDays(today, -1);

    // Lock the learner row to serialize
    // concurrent progress writes for this user.
    await tx.$queryRaw`
      SELECT id
      FROM \`user\`
      WHERE id = ${userId}
      FOR UPDATE
    `;

    const existing = await tx.userActivity.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (existing) {
      return;
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
      },
    });

    const yesterdayActivity =
      await tx.userActivity.findUnique({
        where: {
          userId_date: {
            userId,
            date: yesterday,
          },
        },
      });

    const newStreak = yesterdayActivity
      ? user.currentStreak + 1
      : 1;

    await tx.userActivity.create({
      data: {
        userId,
        date: today,
        durationMinutes: 0,
        isStreakCounted: true,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        currentStreak: newStreak,
        longestStreak: Math.max(
          user.longestStreak,
          newStreak,
        ),
        lastActivityDate: today,
      },
    });
  }

  // =========================================
  // SM-2-INSPIRED REVIEW CALCULATION
  // =========================================

  private calculateReview(
    current: {
      correctCount: number;
      wrongCount: number;
      masteryScore: number;
      easeFactor: number;
      intervalDays: number;
      repetitionCount: number;
    } | null,
    quality: number,
    now: Date,
  ) {
    const previousEase = current?.easeFactor ?? 2.5;

    const successful = quality >= 3;

    const easeFactor = Math.max(
      1.3,
      previousEase +
        (0.1 -
          (5 - quality) *
            (0.08 + (5 - quality) * 0.02)),
    );

    const repetitionCount = successful
      ? (current?.repetitionCount ?? 0) + 1
      : 0;

    let intervalDays: number;

    if (!successful) {
      intervalDays = 1;
    } else if (repetitionCount === 1) {
      intervalDays = 1;
    } else if (repetitionCount === 2) {
      intervalDays = 6;
    } else {
      intervalDays = Math.min(
        3650,
        Math.max(
          1,
          Math.round(
            (current?.intervalDays ?? 1) *
              easeFactor,
          ),
        ),
      );
    }

    const masteryScore = Math.max(
      0,
      Math.min(
        100,
        (current?.masteryScore ?? 0) +
          (successful ? quality * 4 : -15),
      ),
    );

    let masteryLevel: MasteryLevel;

    if (
      masteryScore >= 80 &&
      repetitionCount >= 3
    ) {
      masteryLevel = 'MASTERED';
    } else if (repetitionCount >= 2) {
      masteryLevel = 'REVIEW';
    } else {
      masteryLevel = 'LEARNING';
    }

    return {
      correctCount:
        (current?.correctCount ?? 0) +
        (successful ? 1 : 0),

      wrongCount:
        (current?.wrongCount ?? 0) +
        (successful ? 0 : 1),

      streak: successful
        ? repetitionCount
        : 0,

      masteryScore,
      masteryLevel,
      easeFactor,
      intervalDays,
      repetitionCount,

      nextReviewAt: this.addDays(
        now,
        intervalDays,
      ),

      lastReviewedAt: now,
      firstLearnedAt: now,
    };
  }

  // =========================================
  // REVIEW VOCABULARY
  // =========================================

  async reviewVocabulary(
    userId: string,
    input: ReviewVocabularyDto,
  ) {
    const vocabulary =
      await this.prisma.vocabulary.findFirst({
        where: {
          id: input.vocabularyId,
          status: 'PUBLISHED',
          isPublished: true,
          language: {
            isActive: true,
          },
        },
        select: { id: true },
      });

    if (!vocabulary) {
      throw new NotFoundException(
        'Published vocabulary not found',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      // Serialize writes for the same learner.
      await tx.$queryRaw`
        SELECT id
        FROM \`user\`
        WHERE id = ${userId}
        FOR UPDATE
      `;

      const existing =
        await tx.vocabularyProgress.findUnique({
          where: {
            userId_vocabularyId: {
              userId,
              vocabularyId: input.vocabularyId,
            },
          },
        });

      const values = this.calculateReview(
        existing,
        input.quality,
        now,
      );

      const result =
        await tx.vocabularyProgress.upsert({
          where: {
            userId_vocabularyId: {
              userId,
              vocabularyId: input.vocabularyId,
            },
          },

          create: {
            userId,
            vocabularyId: input.vocabularyId,
            ...values,
          },

          update: {
            correctCount: values.correctCount,
            wrongCount: values.wrongCount,
            streak: values.streak,
            masteryScore: values.masteryScore,
            masteryLevel: values.masteryLevel,
            easeFactor: values.easeFactor,
            intervalDays: values.intervalDays,
            repetitionCount: values.repetitionCount,
            nextReviewAt: values.nextReviewAt,
            lastReviewedAt: values.lastReviewedAt,
          },
        });

      await this.recordActivity(tx, userId, now);

      return {
        vocabularyId: result.vocabularyId,
        masteryLevel: result.masteryLevel,
        masteryScore: result.masteryScore,
        correctCount: result.correctCount,
        wrongCount: result.wrongCount,
        intervalDays: result.intervalDays,
        nextReviewAt: result.nextReviewAt,
      };
    });
  }

  // =========================================
  // DUE VOCABULARY
  // =========================================

  async getDueVocabulary(
    userId: string,
    query: ProgressPaginationDto,
  ) {
    const where: Prisma.VocabularyProgressWhereInput = {
      userId,
      nextReviewAt: {
        lte: new Date(),
      },
      vocabulary: {
        status: 'PUBLISHED',
        isPublished: true,
        language: {
          isActive: true,
          ...(query.language
            ? { code: query.language }
            : {}),
        },
      },
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.vocabularyProgress.findMany({
          where,
          select: {
            id: true,
            masteryLevel: true,
            masteryScore: true,
            nextReviewAt: true,
            vocabulary: {
              select: {
                id: true,
                term: true,
                pronunciation: true,
                grammar: true,
                language: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
                translations: {
                  select: {
                    meaning: true,
                    language: {
                      select: {
                        code: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            { nextReviewAt: 'asc' },
            { id: 'asc' },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),

        this.prisma.vocabularyProgress.count({
          where,
        }),
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

  // =========================================
  // LESSON PROGRESS
  // =========================================

  async updateLessonProgress(
    userId: string,
    input: UpdateLessonProgressDto,
  ) {
    const lesson =
      await this.prisma.lesson.findFirst({
        where: {
          id: input.lessonId,
          status: 'PUBLISHED',
          module: {
            status: 'PUBLISHED',
            course: {
              status: 'PUBLISHED',
              language: {
                isActive: true,
              },
            },
          },
        },
      });

    if (!lesson) {
      throw new NotFoundException(
        'Published lesson not found',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.$queryRaw`
        SELECT id
        FROM \`user\`
        WHERE id = ${userId}
        FOR UPDATE
      `;

      const current = await tx.lessonProgress.findUnique({
        where: {
          userId_lessonId: {
            userId,
            lessonId: input.lessonId,
          },
        },
      });

      // Never silently reduce recorded completion.
      const completion = Math.max(
        current?.completion ?? 0,
        input.completion,
      );

      const completedAt =
        current?.completedAt ??
        (completion === 100 ? now : null);

      const result = await tx.lessonProgress.upsert({
        where: {
          userId_lessonId: {
            userId,
            lessonId: input.lessonId,
          },
        },
        create: {
          userId,
          lessonId: input.lessonId,
          completion,
          completedAt,
          lastPosition: input.lastPosition ?? null,
          lastOpenedAt: now,
        },
        update: {
          completion,
          completedAt,
          lastOpenedAt: now,
          ...(input.lastPosition !== undefined
            ? { lastPosition: input.lastPosition }
            : {}),
        },
      });

      if (input.completion > 0) {
        await this.recordActivity(tx, userId, now);
      }

      return result;
    });
  }

  // =========================================
  // SERVER-SIDE QUIZ GRADING
  // =========================================

  async submitQuiz(
    userId: string,
    input: SubmitQuizDto,
  ) {
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: input.quizId,
        status: 'PUBLISHED',
        isPublished: true,
        OR: [
          { appId: null },
          { app: { isActive: true } },
        ],
        AND: [
          {
            OR: [
              { lessonId: null },
              {
                lesson: {
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
            ],
          },
        ],
      },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!quiz) {
      throw new NotFoundException(
        'Published quiz not found',
      );
    }

    if (
      quiz.questions.length === 0 ||
      quiz.questions.length > 100
    ) {
      throw new BadRequestException(
        'Quiz has an unsupported question count',
      );
    }

    if (
      quiz.questions.length !== input.answers.length
    ) {
      throw new BadRequestException(
        'All quiz questions must be answered',
      );
    }

    const answers = new Map(
      input.answers.map((item) => [
        item.questionId,
        item.answer,
      ]),
    );

    const supportedTextTypes = new Set([
      'IMAGE_TO_TARGET',
      'TEXT_TO_TARGET',
      'AUDIO_TO_TARGET',
      'TARGET_TO_TRANSLATION',
      'TRANSLATION_TO_TARGET',
      'FILL_BLANK',
      'ARTICLE',
      'LISTEN_AND_TYPE',
    ]);

    let score = 0;
    let total = 0;

    const gradedAnswers: Array<{
      questionId: string;
      answer: string;
      isCorrect: boolean;
    }> = [];

    for (const question of quiz.questions) {
      const answer = answers.get(question.id);

      if (!answer) {
        throw new BadRequestException(
          'Question answer is missing or invalid',
        );
      }

      let isCorrect = false;

      if (
        question.questionType === 'MULTIPLE_CHOICE' ||
        question.questionType === 'TRUE_FALSE'
      ) {
        const selected = question.options.find(
          (option) => option.id === answer,
        );

        if (!selected) {
          throw new BadRequestException(
            'Invalid selected option',
          );
        }

        isCorrect = selected.isCorrect;
      } else if (
        supportedTextTypes.has(question.questionType)
      ) {
        if (!question.correctAnswer?.trim()) {
          throw new UnprocessableEntityException(
            'Question has no answer key',
          );
        }

        isCorrect =
          this.normalizeAnswer(answer) ===
          this.normalizeAnswer(
            question.correctAnswer,
          );
      } else {
        throw new UnprocessableEntityException(
          `Automated grading is not available for ${question.questionType}`,
        );
      }

      total += question.points;

      if (isCorrect) {
        score += question.points;
      }

      gradedAnswers.push({
        questionId: question.id,
        answer,
        isCorrect,
      });
    }

    const percentage =
      total > 0 ? (score / total) * 100 : 0;

    const passed =
      percentage >= (quiz.passingScore ?? 60);

    const attempt = await this.prisma.$transaction(
      async (tx) => {
        const now = new Date();

        const saved = await tx.quizAttempt.create({
          data: {
            userId,
            quizId: quiz.id,
            score,
            total,
            percentage,
            startedAt: now,
            completedAt: now,
            answers: {
              create: gradedAnswers,
            },
          },
        });

        await this.recordActivity(tx, userId, now);

        return saved;
      },
    );

    // Do not expose the answer key here.
    return {
      attemptId: attempt.id,
      quizId: quiz.id,
      score,
      total,
      percentage,
      passed,
      completedAt: attempt.completedAt,
    };
  }

  // =========================================
  // QUIZ HISTORY
  // =========================================

  async getQuizHistory(
    userId: string,
    query: ProgressPaginationDto,
  ) {
    const where: Prisma.QuizAttemptWhereInput = {
      userId,
      ...(query.language
        ? {
            quiz: {
              OR: [
                {
                  app: {
                    language: {
                      code: query.language,
                    },
                  },
                },
                {
                  lesson: {
                    module: {
                      course: {
                        language: {
                          code: query.language,
                        },
                      },
                    },
                  },
                },
              ],
            },
          }
        : {}),
    };

    const [data, total] =
      await this.prisma.$transaction([
        this.prisma.quizAttempt.findMany({
          where,
          select: {
            id: true,
            quizId: true,
            score: true,
            total: true,
            percentage: true,
            startedAt: true,
            completedAt: true,
            quiz: {
              select: {
                title: true,
                passingScore: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.quizAttempt.count({ where }),
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

  // =========================================
  // LEARNER DASHBOARD
  // =========================================

  async getDashboard(userId: string) {
    const now = new Date();
    const today = this.utcDay(now);

    const [
      user,
      totalVocabulary,
      dueVocabulary,
      masteredVocabulary,
      completedLessons,
      quizAttempts,
      lastActivity,
    ] = await this.prisma.$transaction([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          displayName: true,
          currentStreak: true,
          longestStreak: true,
          lastActivityDate: true,
        },
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
      this.prisma.quizAttempt.count({
        where: { userId },
      }),
      this.prisma.userActivity.findFirst({
        where: { userId },
        orderBy: { date: 'desc' },
        select: { date: true },
      }),
    ]);

    const yesterday = this.addDays(today, -1);

    const activeStreak =
      lastActivity &&
      (
        lastActivity.date.getTime() === today.getTime() ||
        lastActivity.date.getTime() === yesterday.getTime()
      )
        ? user.currentStreak
        : 0;

    return {
      user: {
        id: user.id,
        displayName: user.displayName,
      },
      vocabulary: {
        learned: totalVocabulary,
        due: dueVocabulary,
        mastered: masteredVocabulary,
      },
      lessons: {
        completed: completedLessons,
      },
      quizzes: {
        attempts: quizAttempts,
      },
      streak: {
        current: activeStreak,
        longest: user.longestStreak,
        timezone: 'UTC',
      },
    };
  }
}
