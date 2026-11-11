
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma.service.js';

import type { Prisma } from '../generated/prisma/client.js';

import type {
  CreateCourseDto,
  UpdateCourseDto,
  AssignCourseAppsDto,
  CreateModuleDto,
  UpdateModuleDto,
  CreateLessonDto,
  UpdateLessonDto,
  UpsertLessonTranslationDto,
  CreateLessonResourceDto,
  UpdateLessonResourceDto,
  CourseQueryDto,
} from './dto/course.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // =====================================
  // COMMON HELPERS
  // =====================================

  private conflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'This slug or unique value already exists',
      );
    }

    throw error;
  }

  private async courseOrThrow(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  private async moduleOrThrow(id: string) {
    const module =
      await this.prisma.courseModule.findUnique({
        where: { id },
      });

    if (!module) {
      throw new NotFoundException('Module not found');
    }

    return module;
  }

  private async lessonOrThrow(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  private async validateLanguage(
    languageId: string,
  ) {
    const language =
      await this.prisma.language.findUnique({
        where: { id: languageId },
      });

    if (!language || !language.isActive) {
      throw new BadRequestException(
        'Language is invalid or inactive',
      );
    }

    return language;
  }

  private async validateLevel(
    languageId: string,
    levelId?: string | null,
  ) {
    if (!levelId) return;

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
      !assignment?.isActive ||
      !assignment.level.framework.isActive
    ) {
      throw new BadRequestException(
        'Level is not available for this language',
      );
    }
  }

  // =====================================
  // COURSES: PUBLIC
  // =====================================

  async findAllCourses(query: CourseQueryDto) {
    const where: Prisma.CourseWhereInput = {
      status: 'PUBLISHED',

      language: {
        isActive: true,
        ...(query.language
          ? { code: query.language }
          : {}),
      },

      ...(query.level
        ? {
            level: {
              code: query.level,
            },
          }
        : {}),

      ...(query.appId
        ? {
            apps: {
              some: {
                appId: query.appId,
                app: {
                  isActive: true,
                },
              },
            },
          }
        : {}),

      ...(query.search
        ? {
            OR: [
              {
                title: {
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
        this.prisma.course.findMany({
          where,
          select: {
            id: true,
            languageId: true,
            levelId: true,
            title: true,
            slug: true,
            description: true,
            sortOrder: true,
            language: {
              select: {
                code: true,
                name: true,
                nativeName: true,
              },
            },
            level: {
              select: {
                code: true,
                name: true,
              },
            },
          },
          orderBy: [
            { sortOrder: 'asc' },
            { title: 'asc' },
          ],
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),

        this.prisma.course.count({ where }),
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

  async findPublishedCourse(id: string) {
    const course = await this.prisma.course.findFirst({
      where: {
        id,
        status: 'PUBLISHED',
        language: {
          isActive: true,
        },
      },
      include: {
        language: {
          select: {
            code: true,
            name: true,
            nativeName: true,
          },
        },
        level: {
          select: {
            code: true,
            name: true,
          },
        },
        modules: {
          where: {
            status: 'PUBLISHED',
          },
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            lessons: {
              where: {
                status: 'PUBLISHED',
              },
              orderBy: {
                sortOrder: 'asc',
              },
              select: {
                id: true,
                title: true,
                slug: true,
                sortOrder: true,
                estimatedMinutes: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException(
        'Published course not found',
      );
    }

    return course;
  }

  // =====================================
  // COURSES: ADMIN
  // =====================================

  async findAllCoursesAdmin(query: CourseQueryDto) {
    const where: Prisma.CourseWhereInput = {
      ...(query.status
        ? { status: query.status }
        : {}),

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

      ...(query.appId
        ? {
            apps: {
              some: {
                appId: query.appId,
              },
            },
          }
        : {}),

      ...(query.search
        ? {
            OR: [
              {
                title: {
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
        this.prisma.course.findMany({
          where,
          include: {
            language: true,
            level: true,
            apps: {
              include: {
                app: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
            _count: {
              select: {
                modules: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          skip: (query.page - 1) * query.limit,
          take: query.limit,
        }),
        this.prisma.course.count({ where }),
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

  async findCourseAdmin(id: string) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        language: true,
        level: true,
        apps: {
          include: {
            app: true,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        modules: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            lessons: {
              orderBy: {
                sortOrder: 'asc',
              },
              include: {
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
                resources: true,
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async createCourse(dto: CreateCourseDto) {
    await this.validateLanguage(dto.languageId);

    await this.validateLevel(
      dto.languageId,
      dto.levelId,
    );

    try {
      return await this.prisma.course.create({
        data: {
          languageId: dto.languageId,
          levelId: dto.levelId ?? null,
          title: dto.title,
          slug: dto.slug,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder,
          status: dto.status,
        },
        include: {
          language: true,
          level: true,
        },
      });
    } catch (error: unknown) {
      this.conflict(error);
    }
  }

  async updateCourse(
    id: string,
    dto: UpdateCourseDto,
  ) {
    const current = await this.courseOrThrow(id);

    if (dto.levelId !== undefined) {
      await this.validateLevel(
        current.languageId,
        dto.levelId,
      );

      if (dto.levelId !== current.levelId) {
        const linkedApps =
          await this.prisma.courseApp.findMany({
            where: {
              courseId: id,
            },
            include: {
              app: true,
            },
          });

        for (const link of linkedApps) {
          if (
            dto.levelId &&
            link.app.levelId !== dto.levelId
          ) {
            throw new ConflictException(
              'Linked apps have incompatible levels',
            );
          }
        }
      }
    }

    try {
      return await this.prisma.course.update({
        where: { id },
        data: dto,
        include: {
          language: true,
          level: true,
        },
      });
    } catch (error: unknown) {
      this.conflict(error);
    }
  }

  async archiveCourse(id: string) {
    await this.courseOrThrow(id);

    return this.prisma.course.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
  }

  // =====================================
  // COURSE ↔ APP ASSIGNMENT
  // =====================================

  async assignApps(
    courseId: string,
    dto: AssignCourseAppsDto,
  ) {
    const course = await this.courseOrThrow(
      courseId,
    );

    const apps = await this.prisma.app.findMany({
      where: {
        id: {
          in: dto.appIds,
        },
      },
    });

    if (apps.length !== dto.appIds.length) {
      throw new BadRequestException(
        'One or more apps do not exist',
      );
    }

    for (const app of apps) {
      if (app.languageId !== course.languageId) {
        throw new BadRequestException(
          `App ${app.slug} belongs to another language`,
        );
      }

      if (
        course.levelId &&
        app.levelId !== course.levelId
      ) {
        throw new BadRequestException(
          `App ${app.slug} has an incompatible level`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.courseApp.deleteMany({
        where: { courseId },
      });

      if (dto.appIds.length > 0) {
        await tx.courseApp.createMany({
          data: dto.appIds.map((appId, index) => ({
            courseId,
            appId,
            sortOrder: index,
          })),
        });
      }
    });

    return this.prisma.courseApp.findMany({
      where: { courseId },
      include: {
        app: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  // =====================================
  // MODULES
  // =====================================

  async findAllModules(courseId: string) {
    const course =
      await this.prisma.course.findFirst({
        where: {
          id: courseId,
          status: 'PUBLISHED',
        },
      });

    if (!course) {
      throw new NotFoundException(
        'Published course not found',
      );
    }

    return this.prisma.courseModule.findMany({
      where: {
        courseId,
        status: 'PUBLISHED',
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        courseId: true,
        title: true,
        slug: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  async findAllModulesAdmin(courseId: string) {
    await this.courseOrThrow(courseId);

    return this.prisma.courseModule.findMany({
      where: { courseId },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            lessons: true,
          },
        },
      },
    });
  }

  async createModule(dto: CreateModuleDto) {
    await this.courseOrThrow(dto.courseId);

    try {
      return await this.prisma.courseModule.create({
        data: {
          courseId: dto.courseId,
          title: dto.title,
          slug: dto.slug,
          description: dto.description ?? null,
          sortOrder: dto.sortOrder,
          status: dto.status,
        },
      });
    } catch (error: unknown) {
      this.conflict(error);
    }
  }

  async updateModule(
    id: string,
    dto: UpdateModuleDto,
  ) {
    await this.moduleOrThrow(id);

    try {
      return await this.prisma.courseModule.update({
        where: { id },
        data: dto,
      });
    } catch (error: unknown) {
      this.conflict(error);
    }
  }

  async archiveModule(id: string) {
    await this.moduleOrThrow(id);

    return this.prisma.courseModule.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
  }

  // =====================================
  // LESSONS
  // =====================================

  async findAllLessons(moduleId: string) {
    const module =
      await this.prisma.courseModule.findFirst({
        where: {
          id: moduleId,
          status: 'PUBLISHED',
          course: {
            status: 'PUBLISHED',
          },
        },
      });

    if (!module) {
      throw new NotFoundException(
        'Published module not found',
      );
    }

    return this.prisma.lesson.findMany({
      where: {
        moduleId,
        status: 'PUBLISHED',
      },
      select: {
        id: true,
        moduleId: true,
        title: true,
        slug: true,
        sortOrder: true,
        estimatedMinutes: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async findAllLessonsAdmin(moduleId: string) {
    await this.moduleOrThrow(moduleId);

    return this.prisma.lesson.findMany({
      where: { moduleId },
      include: {
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
        resources: true,
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });
  }

  async findPublishedLesson(id: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id,
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
      select: {
        id: true,
        title: true,
        slug: true,
        sortOrder: true,
        estimatedMinutes: true,
        translations: {
          select: {
            language: {
              select: {
                code: true,
                name: true,
              },
            },
            title: true,
            content: true,
            format: true,
          },
        },
        resources: {
          where: {
            asset: {
              is: {
                visibility: 'PUBLIC',
                status: 'READY',
              },
            },
          },
          select: {
            id: true,
            title: true,
            type: true,
            sortOrder: true,
            asset: {
              select: {
                publicUrl: true,
                mimeType: true,
                fileSize: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException(
        'Published lesson not found',
      );
    }

    return {
      ...lesson,
      resources: lesson.resources.map((resource) => ({
        ...resource,
        asset: resource.asset
          ? {
              ...resource.asset,
              fileSize:
                resource.asset.fileSize === null
                  ? null
                  : Number(resource.asset.fileSize),
            }
          : null,
      })),
    };
  }

  async findLessonAdmin(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
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
        resources: {
          include: {
            asset: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    return lesson;
  }

  async createLesson(dto: CreateLessonDto) {
    await this.moduleOrThrow(dto.moduleId);

    try {
      return await this.prisma.lesson.create({
        data: {
          moduleId: dto.moduleId,
          title: dto.title,
          slug: dto.slug,
          sortOrder: dto.sortOrder,
          status: dto.status,
          estimatedMinutes:
            dto.estimatedMinutes ?? null,
        },
      });
    } catch (error: unknown) {
      this.conflict(error);
    }
  }

  async updateLesson(
    id: string,
    dto: UpdateLessonDto,
  ) {
    await this.lessonOrThrow(id);

    try {
      return await this.prisma.lesson.update({
        where: { id },
        data: dto,
      });
    } catch (error: unknown) {
      this.conflict(error);
    }
  }

  async archiveLesson(id: string) {
    await this.lessonOrThrow(id);

    return this.prisma.lesson.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
      },
    });
  }

  // =====================================
  // MULTILINGUAL LESSON CONTENT
  // =====================================

  async upsertLessonTranslation(
    lessonId: string,
    dto: UpsertLessonTranslationDto,
  ) {
    await this.lessonOrThrow(lessonId);
    await this.validateLanguage(dto.languageId);

    return this.prisma.lessonTranslation.upsert({
      where: {
        lessonId_languageId: {
          lessonId,
          languageId: dto.languageId,
        },
      },
      create: {
        lessonId,
        languageId: dto.languageId,
        title: dto.title ?? null,
        content: dto.content,
        format: dto.format,
      },
      update: {
        title: dto.title ?? null,
        content: dto.content,
        format: dto.format,
      },
    });
  }

  async removeLessonTranslation(
    lessonId: string,
    languageId: string,
  ) {
    await this.lessonOrThrow(lessonId);

    const existing =
      await this.prisma.lessonTranslation.findUnique({
        where: {
          lessonId_languageId: {
            lessonId,
            languageId,
          },
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Lesson translation not found',
      );
    }

    await this.prisma.lessonTranslation.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  // =====================================
  // LESSON RESOURCES
  // =====================================

  async attachResource(
    lessonId: string,
    dto: CreateLessonResourceDto,
  ) {
    await this.lessonOrThrow(lessonId);

    const asset =
      await this.prisma.mediaAsset.findUnique({
        where: {
          id: dto.assetId,
        },
      });

    if (!asset) {
      throw new NotFoundException(
        'Media asset not found',
      );
    }

    if (asset.type !== dto.type) {
      throw new BadRequestException(
        'Media type does not match resource type',
      );
    }

    if (asset.status !== 'READY') {
      throw new BadRequestException(
        'Media asset is not ready',
      );
    }

    return this.prisma.lessonResource.create({
      data: {
        lessonId,
        assetId: asset.id,
        type: dto.type,
        title: dto.title,
        sortOrder: dto.sortOrder,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        pageCount: asset.pageCount,
      },
    });
  }

  async updateResource(
    lessonId: string,
    resourceId: string,
    dto: UpdateLessonResourceDto,
  ) {
    await this.lessonOrThrow(lessonId);

    const resource =
      await this.prisma.lessonResource.findFirst({
        where: {
          id: resourceId,
          lessonId,
        },
      });

    if (!resource) {
      throw new NotFoundException(
        'Lesson resource not found',
      );
    }

    return this.prisma.lessonResource.update({
      where: {
        id: resource.id,
      },
      data: dto,
    });
  }

  async removeResource(
    lessonId: string,
    resourceId: string,
  ) {
    await this.lessonOrThrow(lessonId);

    const result =
      await this.prisma.lessonResource.deleteMany({
        where: {
          id: resourceId,
          lessonId,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'Lesson resource not found',
      );
    }

    return { success: true };
  }
}
