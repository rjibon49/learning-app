
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type {
  CreateAppInput,
  UpdateAppInput,
  AppConfigInput,
  AppListQuery,
} from './apps.schemas.js';

@Injectable()
export class AppsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private readonly publicSelection = {
    id: true,
    name: true,
    slug: true,
    description: true,
    iconUrl: true,
    primaryColor: true,
    secondaryColor: true,
    isActive: true,
    language: {
      select: {
        id: true,
        code: true,
        name: true,
        nativeName: true,
        direction: true,
      },
    },
    level: {
      select: {
        id: true,
        code: true,
        name: true,
        framework: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    },
  } as const;

  private isUniqueError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  // ==========================================
  // Validation Helpers
  // ==========================================

  private async validateLanguage(
    languageId: string,
  ): Promise<void> {
    const language =
      await this.prisma.language.findUnique({
        where: { id: languageId },
        select: {
          id: true,
          isActive: true,
        },
      });

    if (!language || !language.isActive) {
      throw new BadRequestException(
        'Selected language is invalid or inactive',
      );
    }
  }

  private async validateLevel(
    languageId: string,
    levelId: string | null | undefined,
  ): Promise<void> {
    if (!levelId) {
      return;
    }

    const assignment =
      await this.prisma.languageProficiencyLevel
        .findUnique({
          where: {
            languageId_levelId: {
              languageId,
              levelId,
            },
          },
          include: {
            level: {
              include: {
                framework: true,
              },
            },
          },
        });

    if (
      !assignment ||
      !assignment.isActive ||
      !assignment.level.framework.isActive
    ) {
      throw new BadRequestException(
        'Selected proficiency level is not available for this language',
      );
    }
  }

  private async findAdminAppOrThrow(
    id: string,
  ) {
    const app = await this.prisma.app.findUnique({
      where: { id },
    });

    if (!app) {
      throw new NotFoundException(
        'Application not found',
      );
    }

    return app;
  }

  // ==========================================
  // Public: List Active Applications
  // ==========================================

  async findAll(query?: AppListQuery) {
    const where = {
      isActive: true,
      language: {
        isActive: true,
        ...(query?.language
          ? { code: query.language }
          : {}),
      },
      ...(query?.level
        ? {
            level: {
              code: query.level,
            },
          }
        : {}),
      ...(query?.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                },
              },
              {
                slug: {
                  contains: query.search,
                },
              },
            ],
          }
        : {}),
    };

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;

    const [items, total] =
      await this.prisma.$transaction([
        this.prisma.app.findMany({
          where,
          select: this.publicSelection,
          orderBy: [
            { language: { name: 'asc' } },
            { name: 'asc' },
          ],
          skip: (page - 1) * limit,
          take: limit,
        }),

        this.prisma.app.count({
          where,
        }),
      ]);

    return {
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==========================================
  // Public: Application Details
  // ==========================================

  async findBySlug(slug: string) {
    const app = await this.prisma.app.findFirst({
      where: {
        slug,
        isActive: true,
        language: {
          isActive: true,
        },
      },
      select: {
        ...this.publicSelection,
        config: {
          select: {
            adsEnabled: true,
            subscriptionsEnabled: true,
            guestModeEnabled: true,
            loginRequired: true,
            defaultLanguage: true,
            supportedLanguages: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(
        'Application not found',
      );
    }

    return app;
  }

  // ==========================================
  // Admin: List All Applications
  // ==========================================

  async findAllAdmin(query: AppListQuery) {
    const where = {
      ...(query.language
        ? {
            language: {
              code: query.language,
            },
          }
        : {}),
      ...(query.level
        ? {
            level: {
              code: query.level,
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              {
                name: {
                  contains: query.search,
                },
              },
              {
                slug: {
                  contains: query.search,
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] =
      await this.prisma.$transaction([
        this.prisma.app.findMany({
          where,
          include: {
            language: true,
            level: {
              include: {
                framework: true,
              },
            },
            config: true,
            _count: {
              select: {
                courseLinks: true,
                quizzes: true,
                subscriptions: true,
              },
            },
          },
          orderBy: [
            { createdAt: 'desc' },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),

        this.prisma.app.count({
          where,
        }),
      ]);

    return {
      data: items,
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
  // Admin: Get Application
  // ==========================================

  async findOneAdmin(id: string) {
    const app = await this.prisma.app.findUnique({
      where: { id },
      include: {
        language: true,
        level: {
          include: {
            framework: true,
          },
        },
        config: true,
        _count: {
          select: {
            courseLinks: true,
            quizzes: true,
            subscriptions: true,
            mediaAssets: true,
            flashcardDecks: true,
          },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(
        'Application not found',
      );
    }

    return app;
  }

  // ==========================================
  // Admin: Create Application
  // ==========================================

  async create(input: CreateAppInput) {
    await this.validateLanguage(input.languageId);

    await this.validateLevel(
      input.languageId,
      input.levelId,
    );

    try {
      return await this.prisma.app.create({
        data: {
          languageId: input.languageId,
          levelId: input.levelId ?? null,
          name: input.name,
          slug: input.slug,
          description: input.description ?? null,
          packageName: input.packageName ?? null,
          bundleId: input.bundleId ?? null,
          iconUrl: input.iconUrl ?? null,
          primaryColor: input.primaryColor ?? null,
          secondaryColor: input.secondaryColor ?? null,
          isActive: input.isActive,

          config: {
            create: {
              adsEnabled: true,
              subscriptionsEnabled: true,
              guestModeEnabled: true,
              loginRequired: false,
              defaultLanguage: 'en',
              supportedLanguages: ['en', 'bn'],
            },
          },
        },
        include: {
          language: true,
          level: true,
          config: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueError(error)) {
        throw new ConflictException(
          'App slug, package name or bundle ID already exists',
        );
      }

      throw error;
    }
  }

  // ==========================================
  // Admin: Update Application
  // ==========================================

  async update(
    id: string,
    input: UpdateAppInput,
  ) {
    const existing =
      await this.findAdminAppOrThrow(id);

    if (
      input.levelId !== undefined &&
      input.levelId !== existing.levelId
    ) {
      await this.validateLevel(
        existing.languageId,
        input.levelId,
      );

      // Prevent changing the level of an app
      // that already has linked learning content.
      const linkedContent =
        await this.prisma.courseApp.count({
          where: { appId: id },
        });

      if (linkedContent > 0) {
        throw new ConflictException(
          'Cannot change app level while courses are linked',
        );
      }
    }

    try {
      return await this.prisma.app.update({
        where: { id },
        data: {
          ...input,
        },
        include: {
          language: true,
          level: true,
          config: true,
        },
      });
    } catch (error: unknown) {
      if (this.isUniqueError(error)) {
        throw new ConflictException(
          'Package name or bundle ID already exists',
        );
      }

      throw error;
    }
  }

  // ==========================================
  // Admin: Update Configuration
  // ==========================================

  async updateConfig(
    id: string,
    input: AppConfigInput,
  ) {
    await this.findAdminAppOrThrow(id);

    const current =
      await this.prisma.appConfig.findUnique({
        where: { appId: id },
      });

    const loginRequired =
      input.loginRequired ??
      current?.loginRequired ??
      false;

    const guestModeEnabled =
      input.guestModeEnabled ??
      current?.guestModeEnabled ??
      true;

    if (
      loginRequired &&
      guestModeEnabled
    ) {
      throw new BadRequestException(
        'Guest mode must be disabled when login is required',
      );
    }

    const supportedLanguages =
      input.supportedLanguages ??
      (Array.isArray(current?.supportedLanguages)
        ? current.supportedLanguages.filter(
            (item): item is string =>
              typeof item === 'string',
          )
        : ['en', 'bn']);

    const defaultLanguage =
      input.defaultLanguage ??
      current?.defaultLanguage ??
      'en';

    if (
      !supportedLanguages.includes(defaultLanguage)
    ) {
      throw new BadRequestException(
        'Default language must be included in supported languages',
      );
    }

    return this.prisma.appConfig.upsert({
      where: {
        appId: id,
      },

      create: {
        appId: id,
        adsEnabled: input.adsEnabled ?? true,
        subscriptionsEnabled:
          input.subscriptionsEnabled ?? true,
        guestModeEnabled,
        loginRequired,
        defaultLanguage,
        supportedLanguages,
      },

      update: {
        ...input,
        guestModeEnabled,
        loginRequired,
        defaultLanguage,
        supportedLanguages,
      },
    });
  }

  // ==========================================
  // Admin: Activate / Deactivate App
  // ==========================================

  async setActive(
    id: string,
    isActive: boolean,
  ) {
    await this.findAdminAppOrThrow(id);

    return this.prisma.app.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }
}
